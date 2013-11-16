MoeDNS
======

MoeDNS - A DNS Management app using Node.js & MongoDB, working with [MiniMoeDNS](https://github.com/phoenixlzx/minimoedns) or PowerDNS.

Demo: [MoeDNS](http://moedns.phoenixlzx.com)  

**ATTENTION** Please do NOT point your domain to this site, please use `dig` command to test your record at port 15353.

## Feature

* Multi-user, multi-domain support.
* [IN-PROGRESS] Admin functionality (All User/Domain/Records management)
* [TODO] Better user input validation for domain records.
* A, AAAA, MX, CNAME, SRV, TXT, NS, SOA record support.
* User-friendly record-adding form.
* Customize index, about and help pages.
* Live DNS server status.
* Domain Tansfer between users.
* System stats.
* Dynamic DNS API.
* GeoDNS with MiniMoeDNS.
* Moe theme design!
* And will be more...

## Usage & System requirements

* MoeDNS Server: A Linux server with MongoDB, MySQL and newer version of Node.js installed.

* MiniMoeDNS Servers: Linux server running MiniMoeDNS & MySQL. (Now using PowerDNS MySQL Schema with additional `geo` column in `records` table)

* Servers replication with MySQL is recommended.

--

* `git clone https://github.com/phoenixlzx/moedns.git && cd moedns && npm install`

* Make a copy of `config.js.example` to `config.js` and edit it for you environment.

* Edit `/public/static_html/about.html`.

* `node app.js`

* Done!

## Translation (including moe translation)

https://www.transifex.com/projects/p/moedns/

Special thanks to the translation team!

## Support

IRC channel: #moedns @ freenode

## DDNS Usage

Path: `/api`

Method: GET

Params:
* `domain`: Required - target domain-name to resolve, such as `example.com` or `sub.example.com`.
* `id`: Required - target record id to update, so you need to create it before using.
* `type`: Required - record type, currently only `A` and `AAAA` is supported.
* `ip`: Required(Optional if nat is set to true) - target IP{v4, v6} address to update.
* `ttl`: Optional - Time To Live option, if not present then will be set to 60 for faster resolve.
* `nat`: Optional - if set to `true`, connection IP will be used as target IP (for clients behind NAT networks).
* `key`: Required - your API key.

Example: 

1. Create an 'A' record in your domain `test.com` records list, assuming record ID is `30`.

2. Get your API key at `/myapi`, assuming API key is `1e10a17f50b057acb17bdc1432d095ee`

GET `/api?domain=test.com&id=30&type=A&ip=127.0.1.1&key=1e10a17f50b057acb17bdc1432d095ee`

Now `test.com` will point to `127.0.1.1`.

If your Router does not support custom DDNS service, you could reach your goal using a simple command. e.g., add the following line to your crontab (using criterias above, assuming service url is example.com):

`curl http://example.com/api?domain=test.com&id=30&type=A&nat=true&ttl=600&key=1e10a17f50b057acb17bdc1432d095ee`

And `test.com` will points to the public IP of your side with TTL set to 600.

## License

MoeDNS - A DNS Management app using Node.js & MongoDB, working with MiniMoeDNS or PowerDNS.

Copyright (C) 2013  Phoenix Nemo <i@phoenixlzx.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
