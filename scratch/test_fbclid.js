delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;

const http = require('http');

const url = 'http://localhost:3000/?fbclid=IwdGRleASk5CNleHRuA2FlbQIxMQBzcnRjBmFwcF9pZAo2NjI4NTY4Mzc5AAEeNwNJJNOdUOWzp5I7buZzue_lBYyiKAPCuzV9gIjEk9nJ0KztKm31EdpRfJs_aem_FoH7Zpy2O4tAVLClzgq5Eg';

http.get(url, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers, null, 2)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log(`BODY LENGTH: ${data.length}`);
    if (data.includes('Application error') || data.includes('Internal Server Error')) {
      console.log('Detected server error in body!');
      console.log(data.slice(0, 1000));
    } else {
      console.log('No server-side error detected in body.');
    }
  });
}).on('error', (err) => {
  console.error("Error Details:", err);
});
