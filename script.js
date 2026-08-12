document.addEventListener('DOMContentLoaded', () => {
  // UI Elements
  const hoursEl = document.getElementById('hours');
  const minutesEl = document.getElementById('minutes');
  const secondsEl = document.getElementById('seconds');
  const dateFullEl = document.getElementById('date-full');
  const dayJapaneseEl = document.getElementById('day-japanese');
  const weatherIconEl = document.getElementById('weather-icon');
  const weatherDescEl = document.getElementById('weather-desc');
  const weatherTempEl = document.getElementById('weather-temp');
  const tempHighEl = document.getElementById('temp-high');
  const tempLowEl = document.getElementById('temp-low');
  const popValEl = document.getElementById('pop-val');
  const humidityValEl = document.getElementById('humidity-val');
  const hourlyForecastEl = document.getElementById('hourly-forecast');
  const newsTickerEl = document.getElementById('news-ticker');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  const DAYS_JP = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

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
  // Weather App Style Fetching (Open-Meteo API)
  // ----------------------------------------------------
  function getWeatherInfoByCode(code, hour = 12) {
    const isNight = hour < 6 || hour >= 19;
    if (code === 0) return { text: '快晴', icon: isNight ? '🌙' : '☀️' };
    if (code >= 1 && code <= 2) return { text: '晴れ', icon: isNight ? '🌙' : '🌤️' };
    if (code === 3) return { text: '曇り', icon: '☁️' };
    if (code >= 45 && code <= 48) return { text: '霧', icon: '🌫️' };
    if (code >= 51 && code <= 67) return { text: '雨', icon: '🌧️' };
    if (code >= 71 && code <= 77) return { text: '雪', icon: '❄️' };
    if (code >= 80 && code <= 82) return { text: 'にわか雨', icon: '🌦️' };
    if (code >= 85 && code <= 86) return { text: '大雪', icon: '❄️' };
    if (code >= 95) return { text: '雷雨', icon: '🌩️' };
    return { text: '晴れ', icon: '☀️' };
  }

  async function fetchRealWeather() {
    try {
      const weatherUrl = 'https://api.open-meteo.com/v1/forecast?latitude=35.6762&longitude=139.6503&current_weather=true&hourly=temperature_2m,relativehumidity_2m,precipitation_probability,weathercode&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo';
      const response = await fetch(weatherUrl);
      if (!response.ok) throw new Error('Weather API request failed');

      const data = await response.json();
      const currentHour = new Date().getHours();
      
      // 1. Current Weather Hero
      if (data && data.current_weather) {
        const temp = Math.round(data.current_weather.temperature);
        const code = data.current_weather.weathercode;
        const info = getWeatherInfoByCode(code, currentHour);

        if (weatherIconEl) weatherIconEl.textContent = info.icon;
        if (weatherDescEl) weatherDescEl.textContent = info.text;
        if (weatherTempEl) weatherTempEl.textContent = `${temp}°`;
      }

      // 2. High & Low Temperatures
      if (data && data.daily && data.daily.temperature_2m_max && data.daily.temperature_2m_min) {
        const maxTemp = Math.round(data.daily.temperature_2m_max[0]);
        const minTemp = Math.round(data.daily.temperature_2m_min[0]);
        if (tempHighEl) tempHighEl.textContent = `最高 ${maxTemp}°`;
        if (tempLowEl) tempLowEl.textContent = `最低 ${minTemp}°`;
      }

      // 3. Sub Metrics (Precipitation Probability & Humidity)
      if (data && data.hourly) {
        const pop = data.hourly.precipitation_probability ? data.hourly.precipitation_probability[currentHour] || 0 : 0;
        const humidity = data.hourly.relativehumidity_2m ? data.hourly.relativehumidity_2m[currentHour] || 50 : 50;

        if (popValEl) popValEl.textContent = `${pop}%`;
        if (humidityValEl) humidityValEl.textContent = `${humidity}%`;
      }

      // 4. Hourly Forecast Timeline Chips (Now, +3h, +6h, +9h, +12h)
      if (data && data.hourly && data.hourly.time && hourlyForecastEl) {
        const hourlyHtml = [];

        [0, 3, 6, 9, 12].forEach((offset, idx) => {
          const targetIndex = currentHour + offset;
          const targetHour = (currentHour + offset) % 24;

          if (data.hourly.temperature_2m[targetIndex] !== undefined) {
            const hTemp = Math.round(data.hourly.temperature_2m[targetIndex]);
            const hCode = data.hourly.weathercode[targetIndex];
            const hInfo = getWeatherInfoByCode(hCode, targetHour);
            const timeLabel = idx === 0 ? '今' : `${targetHour}時`;

            hourlyHtml.push(`
              <div class="hourly-chip">
                <span class="chip-time">${timeLabel}</span>
                <span class="chip-icon">${hInfo.icon}</span>
                <span class="chip-temp">${hTemp}°</span>
              </div>
            `);
          }
        });

        if (hourlyHtml.length > 0) {
          hourlyForecastEl.innerHTML = hourlyHtml.join('');
        }
      }

    } catch (error) {
      console.warn('Weather app forecast fetch fallback:', error);
      if (weatherIconEl) weatherIconEl.textContent = '☀️';
      if (weatherDescEl) weatherDescEl.textContent = '晴れ';
      if (weatherTempEl) weatherTempEl.textContent = '27°';
      if (tempHighEl) tempHighEl.textContent = '最高 31°';
      if (tempLowEl) tempLowEl.textContent = '最低 22°';
      if (popValEl) popValEl.textContent = '0%';
      if (humidityValEl) humidityValEl.textContent = '55%';
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
          updateNewsDisplays();
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
      updateNewsDisplays();
    }
  }

  function updateNewsDisplays() {
    if (fetchedNewsItems.length === 0) return;

    if (newsTickerEl) {
      const fullText = fetchedNewsItems.join('　　◆　　') + '　　◆　　';
      newsTickerEl.textContent = fullText;
    }
  }

  fetchRealNews();
  setInterval(fetchRealNews, 180000);

  // ----------------------------------------------------
  // Update Standard Central Clock Mechanics
  // ----------------------------------------------------
  function updateStandardClock() {
    const now = new Date();

    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');

    if (hoursEl) hoursEl.textContent = h;
    if (minutesEl) minutesEl.textContent = m;
    if (secondsEl) secondsEl.textContent = s;

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const dayIdx = now.getDay();

    if (dateFullEl) dateFullEl.textContent = `${year}.${month}.${date}`;
    if (dayJapaneseEl) dayJapaneseEl.textContent = DAYS_JP[dayIdx];
  }

  updateStandardClock();
  setInterval(updateStandardClock, 200);
});
