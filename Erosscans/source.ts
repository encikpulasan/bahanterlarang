import {
  Source,
  Manga,
  Chapter,
  ChapterDetails,
  HomeSection,
  SearchRequest,
  PagedResults,
  SourceInfo,
  TagSection,
  TagType,
  RequestManager,
  LanguageCode,
  MangaStatus,
  HomeSectionType
} from 'paperback-extensions-common'

export class ErosScans extends Source {
  constructor(cheerio: CheerioAPI) {
    super(cheerio)
  }

  async getMangaDetails(mangaId: string): Promise<Manga> {
    const request = createRequestObject({
      url: `https://erosscans.xyz/manga/${mangaId}`,
      method: 'GET'
    })
    const data = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(data.data)
    
    const title = $('.entry-title').text().trim()
    const image = $('.thumb img').attr('src') ?? ''
    const description = $('.entry-content').text().trim()
    const status = $('.imptdt:contains("Status") i').hasClass('custom-dot') ? MangaStatus.ONGOING : MangaStatus.COMPLETED
    const author = $('.fmed:contains("Author") span').text().trim()
    const artist = $('.fmed:contains("Artist") span').text().trim()
    const genres = $('.mgen a').map((_, el) => $(el).text().trim()).get()

    return createManga({
      id: mangaId,
      titles: [title],
      image,
      status,
      author,
      artist,
      desc: description,
      tags: [createTagSection({ id: 'genres', label: 'Genres', tags: genres.map(g => createTag({id: g, label: g})) })]
    })
  }

  async getChapters(mangaId: string): Promise<Chapter[]> {
    const request = createRequestObject({
      url: `https://erosscans.xyz/manga/${mangaId}`,
      method: 'GET'
    })
    const data = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(data.data)
    
    const chapters: Chapter[] = []
    $('.eph-num').each((_, element) => {
      const $element = $(element)
      const $link = $element.find('.chapternum')
      const title = $link.text().trim()
      const chapterId = $link.attr('href')?.split('/').pop() ?? ''
      const chapNum = Number(title.split(' ')[1])
      
      chapters.push(createChapter({
        id: chapterId,
        mangaId: mangaId,
        name: title,
        chapNum: isNaN(chapNum) ? 0 : chapNum,
        time: new Date($element.find('.chapterdate').text().trim())
      }))
    })

    return chapters
  }

  async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
    const request = createRequestObject({
      url: `https://erosscans.xyz/${mangaId}/${chapterId}`,
      method: 'GET'
    })
    const data = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(data.data)
    
    const pages: string[] = []
    $('.reading-content img').each((_, element) => {
      const src = $(element).attr('src')
      if (src) pages.push(src)
    })

    return createChapterDetails({
      id: chapterId,
      mangaId: mangaId,
      pages: pages,
      longStrip: false
    })
  }

  async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
    let page = metadata?.page ?? 1
    const request = createRequestObject({
      url: `https://erosscans.xyz/page/${page}/?s=${encodeURIComponent(query.title ?? '')}`,
      method: 'GET'
    })
    const data = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(data.data)
    
    const manga: Manga[] = []
    $('.bs').each((_, element) => {
      const $element = $(element)
      const $link = $element.find('.bsx > a')
      const title = $link.attr('title') ?? ''
      const id = $link.attr('href')?.split('/').slice(-2, -1)[0] ?? ''
      const image = $element.find('img').attr('src') ?? ''
      
      manga.push(createManga({
        id: id,
        titles: [title],
        image: image
      }))
    })

    const hasNextPage = $('.hpage .r').length > 0

    return createPagedResults({
      results: manga,
      metadata: { page: page + 1 }
    })
  }

  async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
    const request = createRequestObject({
      url: 'https://erosscans.xyz',
      method: 'GET'
    })
    const data = await this.requestManager.schedule(request, 1)
    const $ = this.cheerio.load(data.data)
    
    const popularSection = createHomeSection({
      id: 'popular',
      title: 'Popular Today',
      type: HomeSectionType.featured
    })
    const latestSection = createHomeSection({
      id: 'latest',
      title: 'Latest Update',
      view_more: true,
    })

    // Parse and add manga to sections
    // ...

    sectionCallback(popularSection)
    sectionCallback(latestSection)
  }

  // Implement other required methods...
}
