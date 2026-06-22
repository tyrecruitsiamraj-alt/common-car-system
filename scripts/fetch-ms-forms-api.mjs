const forms = {
  fuel: 'XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUMTlDR0Y0MFlWREVINzEzMFNNNFZSWVBEQi4u',
  inspect: 'XkjN2b05yUyVOYyXYx-7cVniQHtG9_xFuulQOMyLWTRUQ003OFpUWllVQkVCMkszN0hKMFRGSzhTNy4u',
};

const pageUrl = (id) =>
  `https://forms.office.com/Pages/ResponsePage.aspx?id=${encodeURIComponent(id)}`;

const apiUrl = (id) =>
  `https://forms.office.com/formapi/api/forms('${id}')?$select=id,title,description,questions&$expand=questions($expand=choices)`;

for (const [key, id] of Object.entries(forms)) {
  const page = await fetch(pageUrl(id), { redirect: 'follow' });
  const cookies = page.headers.getSetCookie?.() ?? [];
  const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');
  console.log('\n===', key, '===');
  console.log('cookies', cookies.length);
  const api = await fetch(apiUrl(id), {
    headers: {
      Accept: 'application/json',
      Cookie: cookieHeader,
      Referer: pageUrl(id),
      'User-Agent': 'Mozilla/5.0',
    },
  });
  console.log('api status', api.status);
  const text = await api.text();
  console.log(text.slice(0, 4000));
}
