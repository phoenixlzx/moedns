moedns
======

MoeDNS - A DNS Management app using Node.js, MongoDB &amp; PowerDNS with MySQL backend.

# === Under heavy development ===

## Feature

* Multi-user, multi-domain support.
* [IN-PROGRESS] Admin functionality (All User/Domain/Records management)
* [TODO] Better user input validation for domain records.
* A, AAAA, MX, CNAME, SRV, TXT, NS, SOA record support.
* [DONE] More user-friendly record-adding form.
* Customize index, about and help pages.
* Live DNS server status.
* Domain Tansfer between users.
* System stats.
* Dynamic DNS API.
* Moe theme design!
* And will be more...

## Usage & System requirements

* One Linux server with MongoDB , sendmail & newer version of Node.js installed, other Linux servers with PowerDNS with MySQL backend.

* Replication with MySQL is recommended.

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


