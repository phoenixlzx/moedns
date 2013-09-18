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
* Moe theme design!
* Dynamic DNS API.
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

## DDNS Usage

Path: `/api`

Method: GET

Params:
* `domain`: target domain-name to resolve, such as `example.com` or `sub.example.com`.
* `id`: target record id to update, so you need to create it before using.
* `type`: record type, currently only `A` and `AAAA` is supported.
* `ip`: target IP{v4, v6} address to update.
* `ttl`: Time To Live option, if not present then will be set to 60 for faster resolve.
* `nat`: if set to `true`, connection IP will be used as target IP (for clients behind NAT networks).
* `key`: your API key.

Example: 

1. Create an 'A' record in your domain `test.com` records list, assuming record ID is `30`.

2. Get your API key at `/myapi`, assuming API key is `1e10a17f50b057acb17bdc1432d095ee`

GET `/api?domain=test.com&id=30&type=A&ip=127.0.1.1&key=1e10a17f50b057acb17bdc1432d095ee`

Now `test.com` will point to `127.0.1.1`.


