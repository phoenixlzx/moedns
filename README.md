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



