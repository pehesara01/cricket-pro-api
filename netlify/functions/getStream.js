const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function(event, context) {
    // Screenshot එකේ තිබුණු අන්තිම Iframe ලින්ක් එක කෙළින්ම මෙතනට දුන්නා
    const targetUrl = 'https://executeandship.com/premiumgr.php?player=desktop&live=skyscric'; 

    // Blogger එකේ CORS Error එන එක වළක්වන්න අත්‍යවශ්‍ය Headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json"
    };

    // Pre-flight request (OPTIONS) සඳහා Response එක
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 200, headers, body: "" };
    }

    try {
        // Target URL එකට Request එක යැවීම
        const response = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                // සර්වර් එකෙන් ලින්ක් එක ගන්න නම් මේ Referer එක අනිවාර්යයෙන්ම තියෙන්න ඕනේ
                'Referer': 'https://streamcrichd.com/',
                'Origin': 'https://streamcrichd.com'
            },
            timeout: 10000 // තත්පර 10කින් Response එකක් ආවේ නැත්නම් නවත්වනවා
        });

        const html = response.data;
        
        // md5 සහ expires කියන Dynamic Tokens එක්කම m3u8 ලින්ක් එක ගන්න පුළුවන් Regex එකක්
        const m3u8Regex = /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/;
        const match = html.match(m3u8Regex);

        let streamLink = (match && match[1]) ? match[1] : null;

        if (streamLink) {
            // ලින්ක් එක සාර්ථකව හොයාගත්තා නම්
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ success: true, url: streamLink })
            };
        } else {
            // HTML එක ඇතුළේ ලින්ක් එක නැත්නම්
            return {
                statusCode: 200, 
                headers: headers,
                body: JSON.stringify({ success: false, message: "Stream link not found in the source player" })
            };
        }

    } catch (error) {
        // සර්වර් එකේ මොකක් හරි දෝෂයක් ආවොත්
        return {
            statusCode: 200, // Client side ප්ලේයර් එක crash වෙන එක නවත්වන්න 200 යවනවා
            headers: headers,
            body: JSON.stringify({ success: false, message: "Scraper Error: " + error.message })
        };
    }
};