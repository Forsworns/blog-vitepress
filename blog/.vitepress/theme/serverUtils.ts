import matter from "gray-matter";
import fs from "fs-extra";
import globby from "globby";


export async function getBlogs() {
  let paths = await getBlogFilePaths();
  let blogs = await Promise.all(
    paths.map(async (item: string) => {
      // "blog/zh/blogs/20190721/index.md"
      const date = `${item.substring(14, 18)}/${item.substring(18, 20)}/${item.substring(20, 22)}`;
      const raw = await fs.readFile(item, "utf-8");
      const { data } = matter(raw);
      return {
        frontMatter: data,
        date,
        href: item.substring(4, 23),
      };
    })
  );
  blogs.reverse();
  return blogs;
}

async function getBlogFilePaths() {
  let paths = await globby(["blog/zh/blogs/*/index.md", "!blog/zh/blogs/tags"], {
    ignore: ["node_modules", "README.md"],
  });
  return paths;
}