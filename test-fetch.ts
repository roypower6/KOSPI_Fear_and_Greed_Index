async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/fear-greed');
    console.log(res.status);
    const text = await res.text();
    console.log(text);
  } catch (e) {
    console.error(e);
  }
}
test();
