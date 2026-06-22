const urls = {
  fuel: 'https://forms.office.com/Pages/ResponsePage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUMTlDR0Y0MFlWREVINzEzMFNNNFZSWVBEQi4u',
  inspect:
    'https://forms.office.com/Pages/ResponsePage.aspx?id=XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUQ003OFpUWllVQkVCMkszN0hKMFRGSzhTNy4u',
};

for (const [key, url] of Object.entries(urls)) {
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await r.text();
  console.log('\n===', key, 'status', r.status, 'bytes', html.length, '===');
  const title = html.match(/<title>([^<]+)<\/title>/i);
  if (title) console.log('page title:', title[1]);
  for (const re of [
    /"formTitle":"([^"]+)"/g,
    /"title":"([^"]{4,300})"/g,
    /"subtitle":"([^"]+)"/g,
    /"questionText":"([^"]+)"/g,
    /"QuestionText":"([^"]+)"/g,
  ]) {
    const hits = [...html.matchAll(re)].map((m) => m[1]);
    if (hits.length) {
      console.log(re.source, 'count', hits.length);
      console.log([...new Set(hits)].slice(0, 40).join('\n  '));
    }
  }
}
