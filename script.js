document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsLargeEl = document.getElementById('seconds-large');
  const dateFullEl = document.getElementById('date-full');
  const dayJapaneseEl = document.getElementById('day-japanese');
  const weatherIconEl = document.getElementById('weather-icon');
  const weatherDescEl = document.getElementById('weather-desc');
  const weatherTempEl = document.getElementById('weather-temp');
  const newsTickerEl = document.getElementById('news-ticker');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  const DAYS_JP = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  let previousSecond = -1;

  // ----------------------------------------------------
  // Fullscreen & Screen Tap Reveal Toggle Logic
  // ----------------------------------------------------
  let hideControlsTimer = null;

  function revealControls() {
    if (!fullscreenBtn) return;
    fullscreenBtn.classList.remove('hidden');
    
    if (hideControlsTimer) clearTimeout(hideControlsTimer);
    hideControlsTimer = setTimeout(() => {
      fullscreenBtn.classList.add('hidden');
    }, 3500);
  }

  document.addEventListener('click', (e) => {
    if (fullscreenBtn && fullscreenBtn.contains(e.target)) return;
    revealControls();
  });

  document.addEventListener('touchstart', () => {
    revealControls();
  }, { passive: true });

  function toggleFullscreen() {
    const doc = document;
    const docEl = document.documentElement;

    const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    if (!isFullscreen) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        docEl.mozRequestFullScreen();
      } else if (docEl.msRequestFullscreen) {
        docEl.msRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  }

  function updateFullscreenUI() {
    const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    if (isFullscreen) {
      document.body.classList.add('is-fullscreen');
    } else {
      document.body.classList.remove('is-fullscreen');
    }
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFullscreen();
      revealControls();
    });
  }

  ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
    document.addEventListener(evt, updateFullscreenUI);
  });

  // ----------------------------------------------------
  // Real-time Weather Fetching (Open-Meteo API)
  // ----------------------------------------------------
  async function fetchRealWeather() {
    try {
      const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&current_weather=true';
      const response = await fetch(weatherUrl);
      if (!response.ok) throw new Error('Weather API request failed');

      const data = await response.json();
      if (data && data.current_weather) {
        const temp = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;
        
        let weatherText = '晴れ';
        let weatherIcon = '☀️';

        if (code === 0) {
          weatherText = '晴れ'; weatherIcon = '☀️';
        } else if (code >= 1 && code <= 3) {
          weatherText = '曇り'; weatherIcon = '🌤️';
        } else if (code >= 45 && code <= 48) {
          weatherText = '霧'; weatherIcon = '🌫️';
        } else if (code >= 51 && code <= 82) {
          weatherText = '雨'; weatherIcon = '🌧️';
        } else if (code >= 85 && code <= 86) {
          weatherText = '雪'; weatherIcon = '❄️';
        } else if (code >= 95) {
          weatherText = '雷雨'; weatherIcon = '🌩️';
        }

        if (weatherIconEl) weatherIconEl.textContent = weatherIcon;
        if (weatherDescEl) weatherDescEl.textContent = weatherText;
        if (weatherTempEl) weatherTempEl.textContent = `${temp}°C`;
      }
    } catch (error) {
      console.warn('Weather fetch fallback:', error);
      if (weatherIconEl) weatherIconEl.textContent = '☀️';
      if (weatherDescEl) weatherDescEl.textContent = '晴れ';
      if (weatherTempEl) weatherTempEl.textContent = '27°C';
    }
  }

  fetchRealWeather();
  setInterval(fetchRealWeather, 600000);

  // ----------------------------------------------------
  // Real-time News Feeds (NHK News RSS)
  // ----------------------------------------------------
  const RSS_FEEDS = [
    'https://www.nhk.or.jp/rss/news/cat0.xml',
    'https://www.nhk.or.jp/rss/news/cat1.xml'
  ];

  let fetchedNewsItems = [];

  async function fetchRealNews() {
    for (const feedUrl of RSS_FEEDS) {
      try {
        const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) continue;
        
        const data = await response.json();
        if (data && data.status === 'ok' && data.items && data.items.length > 0) {
          fetchedNewsItems = data.items.slice(0, 8).map(item => item.title.trim());
          updateNewsTickerText();
          return;
        }
      } catch (e) {
        console.warn('Trying next news feed candidate due to:', e);
      }
    }

    if (fetchedNewsItems.length === 0) {
      fetchedNewsItems = [
        "気象庁: 本日の最新気象情報をお伝えします",
        "経済情報: 国内外の主要株式市場は概ね堅調に推移",
        "交通情報: 各交通機関は概ね平常通り運転を行っております"
      ];
      updateNewsTickerText();
    }
  }

  function updateNewsTickerText() {
    if (newsTickerEl && fetchedNewsItems.length > 0) {
      const fullText = fetchedNewsItems.join('　　◆　　') + '　　◆　　';
      newsTickerEl.textContent = fullText;
    }
  }

  fetchRealNews();
  setInterval(fetchRealNews, 180000);

  // ----------------------------------------------------
  // Update Signage Clock Mechanics
  // ----------------------------------------------------
  function updateSignageClock() {
    const now = new Date();

    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const currentSecond = now.getSeconds();
    const sStr = String(currentSecond).padStart(2, '0');

    if (hoursEl) hoursEl.textContent = h;
    if (minutesEl) minutesEl.textContent = m;

    if (currentSecond !== previousSecond) {
      if (secondsLargeEl) {
        secondsLargeEl.textContent = sStr;
        secondsLargeEl.classList.remove('tick-fade');
        void secondsLargeEl.offsetWidth; // Trigger reflow
        secondsLargeEl.classList.add('tick-fade');
      }
      previousSecond = currentSecond;
    }

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const dayIdx = now.getDay();

    if (dateFullEl) dateFullEl.textContent = `${year}.${month}.${date}`;
    if (dayJapaneseEl) dayJapaneseEl.textContent = DAYS_JP[dayIdx];
  }

  updateSignageClock();
  setInterval(updateSignageClock, 50);
});
