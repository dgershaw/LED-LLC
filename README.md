# Light Efficient Design website (test copy)

A preview of the new Light Efficient Design, RemPhos and Solera website, published with GitHub Pages so it can be shared without a Claude login.

- Every page is generated. The generator, catalog data and notes live in the project files (`led-site`), so edit there and redeploy rather than changing HTML here.
- Pages carry a `noindex` tag and `robots.txt` blocks crawlers, so this copy stays out of search results.
- Part numbers and specifications come from the 2026 Full Product Catalog and the spec sheets supplied so far.

## Updating files through the admin page

The spec sheets, installation instructions, IES files and case studies can be managed at https://app.pagescms.org without touching any code (configured by `.pages.yml`).

- Pages link to files by their exact names. To replace a file, delete the old one and upload the new one under the same name. A second upload under an existing name is saved as `name-1.pdf`, which no page links to.
- A changed file is live on the site a minute or two after it is saved.
- A brand-new document is stored right away but appears on a page only after the site is rebuilt. Ask Claude in the project thread to link it.
- Uploads are copied back into the generator before every rebuild, so a rebuild never undoes them.
