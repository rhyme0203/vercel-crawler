const fetch = require('node-fetch');
const cheerio = require('cheerio');

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

    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log('Fetching post content for URL:', url);
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let contentElement = null;
    let siteCode = '';
    
    // 사이트별 본문 선택자
    if (url.includes('clien.net')) {
      siteCode = 'clien';
      contentElement = $('.post_content');
    } else if (url.includes('82cook.com')) {
      siteCode = 'cook82';
      contentElement = $('.articleBody, #articleBody, .content, .post_content');
    } else if (url.includes('dogdrip.net')) {
      siteCode = 'ddanzi';
      contentElement = $('div[class*="document_"][class*="rhymix_content"][class*="xe_content"]');
    } else if (url.includes('bobaedream.co.kr')) {
      siteCode = 'bobaedream';
      contentElement = $('.content02, .docuCont03 .bodyCont, .docuCont03 .content');
    }

    if (!contentElement || contentElement.length === 0) {
      return res.json({ content: '본문 내용을 찾을 수 없습니다.' });
    }

    // 이미지 URL 처리 및 절대 경로 변환
    contentElement.find('img').each((i, img) => {
      let src = $(img).attr('src');
      if (src && !src.startsWith('http')) {
        let baseUrl = new URL(url).origin;
        if (siteCode === 'ddanzi') {
          baseUrl = 'https://www.dogdrip.net';
        }
        $(img).attr('src', baseUrl + src);
      }
    });

    // 비디오 URL 처리
    contentElement.find('video, iframe').each((i, media) => {
      let src = $(media).attr('src');
      if (src && !src.startsWith('http')) {
        let baseUrl = new URL(url).origin;
        $(media).attr('src', baseUrl + src);
      }
    });

    // 불필요한 요소 제거
    const unwantedSelectors = [
      'script', 'style', 'nav', 'header', 'footer', '.ad', '.advertisement', '.banner', 
      '.sidebar', '.comment', '.reply', '.related', '.recommend', '.menu', '.navigation', 
      '.header', '.footer', '.sidebar', '.aside', '.widget', '.popup', '.ads', 
      '.ad-banner', '.advertisement', '.sponsor', 'label', 'input', 'button', 'form', 
      '.login', '.signup', '.auth', '.user', '.member', '.profile', '.account', 
      '.settings', '.config', '.option', '.checkbox', '.radio', '.select', '.option', 
      '.keepid', '.login-optn', '.signup-optn', '.favorite-text', '.favorite', 
      '.bookmark', '.like', '.share', '.social', '.toolbar', '.action', '.btn', 
      '.button', '.comment-list', '.comment-item', '.reply-list', '.reply-item', 
      '.comment-area', '.reply-area', '.comment-box', '.reply-box', '.comment-section', 
      '.reply-section', '.comment-container', '.reply-container', '.thumb', '.image', 
      '.photo', '.picture', '.media', '.gallery', '.carousel', '.slider'
    ];
    
    contentElement.find(unwantedSelectors.join(', ')).remove();

    // 텍스트 노드만 추출하여 불필요한 텍스트 필터링
    let textContent = '';
    contentElement.contents().each((i, node) => {
      if (node.type === 'text') {
        let text = $(node).text().trim();
        if (text) {
          textContent += text + '\n';
        }
      }
    });

    // 이미지와 비디오 태그를 텍스트 콘텐츠에 추가
    contentElement.find('img, video, iframe').each((i, media) => {
      const src = $(media).attr('src');
      if (src) {
        if ($(media).is('img')) {
          textContent += `\n[이미지 ${i + 1}]\n${src}\n`;
        } else if ($(media).is('video') || $(media).is('iframe')) {
          textContent += `\n[동영상 ${i + 1}]\n${src}\n`;
        }
      }
    });

    const cleanedContent = textContent.trim();
    console.log('Post content fetched successfully, length:', cleanedContent.length);
    res.json({ content: cleanedContent });

  } catch (error) {
    console.error('Error fetching post content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch post content',
      message: error.message,
      stack: error.stack
    });
  }
};
