import sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=["--use-gl=swiftshader","--enable-unsafe-swiftshader"])
    pg = b.new_page(viewport={"width":800,"height":500})
    pg.route("https://**/*", lambda r: r.fulfill(body="", content_type="text/javascript"))
    pg.goto("http://localhost:"+__import__("os").environ.get("BT_PORT","4173")+"/"+sys.argv[1])
    pg.wait_for_function("document.getElementById('loading').classList.contains('done')", timeout=60000)
    pg.wait_for_timeout(int(sys.argv[3]) if len(sys.argv)>3 else 500)
    print(pg.evaluate(sys.argv[2]))
    b.close()
