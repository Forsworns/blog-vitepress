import lottie from "lottie-web";

export type Blog = {
  frontMatter: {
    title?: string;
    tags?: string[];
    description?: string;
  };
  date: string;
  href: string;
}; 

export function attachLottie(id: string, path: string, width: string) {
  // storage lottie
  const svgContainer = document.getElementById(id);
  if (svgContainer) {
    return;
  }
  // created insertNode and add style
  const insertNode = document.createElement("div");
  insertNode.id = id;
  insertNode.style.width = width;
  insertNode.style.margin = "0 auto";
  const pic = document.getElementsByClassName("pic")[0];
  pic.appendChild(insertNode);
  // created lottie
  lottie.loadAnimation({
    container: insertNode,
    renderer: "svg",
    loop: true,
    path,
  });
}