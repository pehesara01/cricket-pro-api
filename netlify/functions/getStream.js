const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function(event, context) {
    // මේ ලින්ක් එක අර ප්ලේයර් එක තියෙන intermediate පේජ් එකයි (මීට වඩා ස්ථාවරයි)
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

    try {
        // පියවර 1: Intermediate page එකට Request එකක් යවනවා
        const res1 = await axios.get(initialUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': 'https://vf.crichd.tv/'
            }
        });

        const $ = cheerio.load(res1.data);
        
        // පියවර 2: Page එක ඇතුළේ තියෙන ප්ලේයර් Iframe එකේ ලින්ක් එක (src) ගන්නවා
        let playerUrl = $('iframe').attr('src');

        if (!playerUrl) {
             throw new Error("Could not find the player iframe source in intermediate page.");
        }

        // ලින්ක් එක පටන් ගන්නේ // නම් ඒකට https: එකතු කරනවා
        if (playerUrl.startsWith('//')) {
            playerUrl = `https:${playerUrl}`;
        }

        // පියවර 3: දැන් ඒ හොයාගත්ත අලුත්ම ප්ලේයර් ලින්ක් එකට ගිහින් m3u8 එක හොයනවා
        const res2 = await axios.get(playerUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Referer': initialUrl
            }
        });

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
            body: JSON.stringify({ success: false, message: "Scraper Error: " + error.message })
        };
    }
};