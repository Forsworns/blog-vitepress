import { dirname } from "path";
import globby from "globby";
import fs from "fs-extra";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import type { FeedOptions, Item } from "feed";
import { Feed } from "feed";

const DOMAIN = "https://forsworns.github.io/";
const AUTHOR = {
  name: "Peihao Yang",
  email: "peihao.young@gmail.com",
  link: DOMAIN,
};
const OPTIONS: FeedOptions = {
  title: "Peihao Yang",
  description: "Personal Blog",
  id: `${DOMAIN}/`,
  link: `${DOMAIN}/`,
  copyright: "MIT License",
  feedLinks: {
    json: DOMAIN + "/feed.json",
    atom: DOMAIN + "/feed.atom",
    rss: DOMAIN + "/feed.xml",
  },
  author: AUTHOR,
  image: "https://forsworns.github.io/assets/logo.png",
  favicon: "https://forsworns.github.io/assets/logo.png",
};

const markdown = MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
});

export async function buildBlogRSS() {
  const posts = await generateRSS();
  writeFeed("feed", posts);
}

async function generateRSS() {
  const files = await globby(["blog/zh/blogs/*/index.md", "!blog/zh/blogs/tags"], {
    ignore: ["node_modules", "README.md"],
  });

  const posts: any[] = (
    await Promise.all(
      files
        .map(async (item) => {
          const raw = await fs.readFile(item, "utf-8");
          const { data, content } = matter(raw);
          const html = markdown
            .render(content)
            .replace('src="/', `src="${DOMAIN}/`);
          const link = `${DOMAIN}/${item.substring(4, 23)}`;
          const date = new Date(
            `${item.substring(14, 18)}-${item.substring(18, 20)}-${item.substring(20, 22)}`
          );
          return {
            ...data,
            date,
            content: html,
            author: [AUTHOR],
            link,
          };
        })
    )
  ).filter(Boolean);

  posts.sort((a, b) => +new Date(b.date) - +new Date(a.date));
  return posts;
}

async function writeFeed(name: string, items: Item[]) {
  const feed = new Feed(OPTIONS);
  items.forEach((item) => feed.addItem(item));

  await fs.ensureDir(dirname(`./blog/.vitepress/dist/${name}`));
  await fs.writeFile(`./blog/.vitepress/dist/${name}.xml`, feed.rss2(), "utf-8");
  await fs.writeFile(`./blog/.vitepress/dist/${name}.atom`, feed.atom1(), "utf-8");
  await fs.writeFile(`./blog/.vitepress/dist/${name}.json`, feed.json1(), "utf-8");
}
