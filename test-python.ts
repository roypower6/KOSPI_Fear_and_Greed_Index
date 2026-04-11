import { execSync } from 'child_process';
try {
  execSync('python3 -c "import urllib.request; urllib.request.urlretrieve(\'https://bootstrap.pypa.io/get-pip.py\', \'get-pip.py\')"');
  execSync('python3 get-pip.py --user');
  execSync('python3 -m pip install pykrx --user');
  console.log(execSync('python3 -c "from pykrx import stock; print(stock.get_market_fundamental(\'20240101\', \'20240110\', \'KOSPI\'))"').toString());
} catch (e) {
  console.error(e);
}
