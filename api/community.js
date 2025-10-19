const fetch = require('node-fetch');
const cheerio = require('cheerio');

// 공지성 글 필터링 함수
function isNoticePost(title) {
  const noticeKeywords = [
    '공지', '이용 규칙', '규칙과 공지', '이용안내', '안내',
    '비밀번호를 변경', '회원님들께 당부', '뉴스기사 등 무단',
    '자유게시판은', '보유세 인상이요', '엄마들 말듣다보면',
    '사건반장', '국감이 엉망', '절대 안사는거'
  ];
  
  return noticeKeywords.some(keyword => title.includes(keyword));
}

// 사이트별 파싱 함수
async function parseSitePosts(html, site) {
  const $ = cheerio.load(html);
  const posts = [];
  
  try {
    let postElements;
    
    switch (site.code) {
      case 'clien':
        postElements = $('.list_row, .list_item, .board_list tr, .list_table tr, table tr, .board_list tr');
        postElements.each((index, element) => {
          if (index >= 10) return false;
          const $el = $(element);
          const titleElement = $el.find('a[href*="/service/board/park/"], a[href*="board/park"]');
          const title = titleElement.text().trim();
          const url = titleElement.attr('href');
          const viewsElement = $el.find('.hit, .view_count, .list_count, td:nth-child(4), td:nth-child(5)');
          const views = viewsElement.text().trim() || '0';
          const timeElement = $el.find('.time, .date, .list_time, td:nth-child(3), td:nth-child(4)');
          const time = timeElement.text().trim() || new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

          if (title && url) {
            const fullUrl = url.startsWith('http') ? url : `https://www.clien.net${url}`;
            const postId = url.match(/(\d+)/)?.[1] || `clien_${index}`;

            posts.push({
              id: postId,
              site: site.name,
              siteCode: site.code,
              title: title,
              url: fullUrl,
              views: views,
              time: time,
              timestamp: Date.now() - (index * 60000)
            });
          }
        });
        break;
        
      case 'cook82':
        postElements = $('.title');
        postElements.each((index, element) => {
          if (index >= 10) return false;
          const $el = $(element);
          const titleElement = $el.find('a');
          const title = titleElement.text().trim();
          const url = titleElement.attr('href');
          
          if (title && url && !isNoticePost(title)) {
            const fullUrl = url.startsWith('http') ? url : `https://www.82cook.com${url}`;
            const postId = url.match(/(\d+)/)?.[1] || `cook82_${index}`;
            
            posts.push({
              id: postId,
              site: site.name,
              siteCode: site.code,
              title: title,
              url: fullUrl,
              views: '0',
              time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              timestamp: Date.now() - (index * 60000)
            });
          }
        });
        break;
        
      case 'ddanzi':
        postElements = $('.title');
        postElements.each((index, element) => {
          if (index >= 10) return false;
          const $el = $(element);
          const titleElement = $el.find('a');
          const title = titleElement.text().trim();
          const url = titleElement.attr('href');
          
          if (title && url && !isNoticePost(title)) {
            const fullUrl = url.startsWith('http') ? url : `https://www.dogdrip.net${url}`;
            const postId = url.match(/(\d+)/)?.[1] || `ddanzi_${index}`;
            
            posts.push({
              id: postId,
              site: site.name,
              siteCode: site.code,
              title: title,
              url: fullUrl,
              views: '0',
              time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
              timestamp: Date.now() - (index * 60000)
            });
          }
        });
        break;
        
      case 'bobaedream':
        postElements = $('.list_row, .list_item, .board_list tr, .list_table tr, table tr, .board_list tr');
        postElements.each((index, element) => {
          if (index >= 10) return false;
          const $el = $(element);
          const titleElement = $el.find('a[href*="/view/"], a[href*="view"]');
          const title = titleElement.text().trim();
          const url = titleElement.attr('href');
          const viewsElement = $el.find('.hit, .view_count, .list_count, td:nth-child(4), td:nth-child(5)');
          const views = viewsElement.text().trim() || '0';
          const timeElement = $el.find('.time, .date, .list_time, td:nth-child(3), td:nth-child(4)');
          const time = timeElement.text().trim() || new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
          
          if (title && url) {
            const fullUrl = url.startsWith('http') ? url : `https://www.bobaedream.co.kr${url}`;
            const postId = url.match(/(\d+)/)?.[1] || `bobaedream_${index}`;
            
            posts.push({
              id: postId,
              site: site.name,
              siteCode: site.code,
              title: title,
              url: fullUrl,
              views: views,
              time: time,
              timestamp: Date.now() - (index * 60000)
            });
          }
        });
        break;
    }
  } catch (error) {
    console.error(`Error parsing ${site.name}:`, error);
  }
  
  return posts;
}

// 크롤링할 사이트들
const sites = [
  { name: '클리앙', code: 'clien', url: 'https://www.clien.net/service/board/park' },
  { name: '82쿡', code: 'cook82', url: 'https://www.82cook.com/entiz/enti.php?bn=15' },
  { name: '개드립', code: 'ddanzi', url: 'https://www.dogdrip.net/dogdrip' },
  { name: '보배드림', code: 'bobaedream', url: 'https://www.bobaedream.co.kr/list?code=best' }
];

// 커뮤니티 데이터 크롤링 함수
async function crawlAllSites() {
  console.log('크롤링 시작...');
  const allPosts = [];
  const siteStats = {};

  for (const site of sites) {
    console.log(`${site.name} 크롤링 중...`);
    try {
      const response = await fetch(site.url);
      const html = await response.text();
      const posts = await parseSitePosts(html, site);
      
      allPosts.push(...posts);
      siteStats[site.name] = posts.length;
      console.log(`${site.name}: ${posts.length}개 게시글 크롤링 완료`);
    } catch (error) {
      console.error(`Error parsing ${site.name}:`, error);
      siteStats[site.name] = 0;
    }
  }
  
  allPosts.sort((a, b) => b.timestamp - a.timestamp);
  
  return {
    posts: allPosts.slice(0, 50),
    siteStats: siteStats,
    lastUpdated: new Date().toISOString()
  };
}

module.exports = async (req, res) => {
  try {
    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    console.log('Starting community data fetch...');
    const data = await crawlAllSites();
    console.log('Community data fetched successfully:', data.posts.length, 'posts');
    res.status(200).json(data);
  } catch (error) {
    console.error('Error in community API:', error);
    res.status(500).json({ 
      error: 'Failed to fetch community data',
      message: error.message,
      stack: error.stack
    });
  }
};
