const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function(event, context) {
    const initialUrl = 'https://streamcrichd.com/update/skys2.php'; 

    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    // සාමාන්‍ය Browser එකක් ලෙස පෙන්වීමට අවශ්‍ය සම්පූර්ණ Headers
    const fakeBrowserHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Cache-Control': 'max-age=0'
    };

    try {
        let res1;
        try {
            // පියවර 1: Intermediate page එකට Request එක යැවීම
            res1 = await axios.get(initialUrl, {
                headers: { ...fakeBrowserHeaders, 'Referer': 'https://vf.crichd.tv/' },
                timeout: 8000
            });
        } catch (e) {
            throw new Error("Step 1 (Initial Page) Failed: " + e.message);
        }

        const $ = cheerio.load(res1.data);
        let playerUrl = $('iframe').attr('src');

        if (!playerUrl) {
             throw new Error("Could not find the player iframe source in intermediate page.");
        }

        if (playerUrl.startsWith('//')) {
            playerUrl = `https:${playerUrl}`;
        }

        let res2;
        try {
            // පියවර 2: Player page එකට Request එක යැවීම
            res2 = await axios.get(playerUrl, {
                headers: { ...fakeBrowserHeaders, 'Referer': initialUrl },
                timeout: 8000
            });
        } catch (e) {
            throw new Error("Step 2 (Player Page) Failed: " + e.message);
        }

        const html = res2.data;
        const m3u8Regex = /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/;
        const match = html.match(m3u8Regex);

        let streamLink = (match && match[1]) ? match[1] : null;

        if (streamLink) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ success: true, url: streamLink })
            };
        } else {
            return {
                statusCode: 200, 
                headers: headers,
                body: JSON.stringify({ success: false, message: "M3U8 link not found in final source" })
            };
        }

    } catch (error) {
        return {
            statusCode: 200, 
            headers: headers,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};