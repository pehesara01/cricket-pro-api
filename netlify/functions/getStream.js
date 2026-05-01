const axios = require('axios');
const cheerio = require('cheerio');

exports.handler = async function(event, context) {
    // අපි යන්න හදන original ලින්ක් එක
    const targetUrl = 'https://streamcrichd.com/update/skys2.php'; 
    
    // Proxy එක හරහා යන ලින්ක් එක (IP Block එක කැඩීමට)
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;

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
        // පියවර 1: Proxy එක හරහා Page එක අරගන්නවා
        const response = await axios.get(proxyUrl, {
            timeout: 15000 // Proxy එක හරහා යන නිසා ටිකක් වෙලා යන්න පුළුවන්
        });

        const html = response.data;
        const $ = cheerio.load(html);
        
        // Iframe එක ඇතුළේ තියෙන ප්ලේයර් ලින්ක් එක හොයනවා
        let playerUrl = $('iframe').attr('src');

        if (!playerUrl) {
            // පේජ් එකේ Iframe එක නැත්නම් මුළු HTML එකේම m3u8 එකක් තියෙනවද බලනවා
            const m3u8Regex = /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/;
            const match = html.match(m3u8Regex);
            
            if (match && match[1]) {
                return {
                    statusCode: 200,
                    headers: headers,
                    body: JSON.stringify({ success: true, url: match[1] })
                };
            }
            throw new Error("Stream link or Iframe not found in the page content.");
        }

        // පියවර 2: හොයාගත්ත Player URL එකටත් Proxy එක හරහාම යනවා
        if (playerUrl.startsWith('//')) playerUrl = `https:${playerUrl}`;
        const finalProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(playerUrl)}`;

        const finalRes = await axios.get(finalProxyUrl);
        const finalHtml = finalRes.data;
        
        const m3u8RegexFinal = /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/;
        const finalMatch = finalHtml.match(m3u8RegexFinal);

        if (finalMatch && finalMatch[1]) {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ success: true, url: finalMatch[1] })
            };
        } else {
            return {
                statusCode: 200,
                headers: headers,
                body: JSON.stringify({ success: false, message: "M3U8 link not found in player source" })
            };
        }

    } catch (error) {
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ success: false, message: "Proxy Scraper Error: " + error.message })
        };
    }
};