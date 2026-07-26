import { defineConfig } from "tinacms";

const branch = process.env.TINA_BRANCH || process.env.GIT_BRANCH || "main";
const clientId = process.env.TINA_PUBLIC_CLIENT_ID || "";
const token = process.env.TINA_TOKEN || "";

export default defineConfig({
  branch,
  clientId,
  token,
  localContentPath: "../content",
  build: {
    outputFolder: "tina",
    publicFolder: "web",
  },
  media: {
    tina: {
      mediaRoot: "assets",
      publicFolder: "web",
    },
  },
  schema: {
    collections: [
      {
        name: "journal",
        label: "杂志文章",
        path: "journal",
        format: "mdx",
        ui: {
          router: ({ document }) => `/journal/?id=${document._sys.filename}`,
        },
        fields: [
          { type: "string", name: "titleZh", label: "中文标题", isTitle: true, required: true },
          { type: "string", name: "titleEn", label: "英文标题", required: true },
          {
            type: "string",
            name: "category",
            label: "分类",
            required: true,
            options: [
              { label: "生活方式", value: "lifestyle" },
              { label: "物件", value: "objects" },
              { label: "材料", value: "materials" },
              { label: "品牌", value: "brands" },
              { label: "国家", value: "countries" },
              { label: "工艺", value: "craft" },
              { label: "设计师", value: "designers" },
              { label: "杂志专题", value: "issues" },
            ],
          },
          { type: "string", name: "categoryZh", label: "中文分类名" },
          { type: "string", name: "categoryEn", label: "英文分类名" },
          { type: "image", name: "coverImage", label: "封面图" },
          { type: "string", name: "excerptZh", label: "中文摘要", ui: { component: "textarea" } },
          { type: "string", name: "excerptEn", label: "英文摘要", ui: { component: "textarea" } },
          { type: "string", name: "authorZh", label: "中文作者" },
          { type: "string", name: "authorEn", label: "英文作者" },
          { type: "datetime", name: "publishedAt", label: "发布时间" },
          { type: "number", name: "readingTime", label: "阅读时间（分钟）" },
          { type: "boolean", name: "requiresMembership", label: "需要会员权限" },
          { type: "string", name: "issue", label: "所属专题 ID" },
          { type: "string", name: "collection", label: "所属 Collection ID" },
          {
            type: "string",
            name: "relatedProductIds",
            label: "关联商品 ID",
            list: true,
          },
          {
            type: "string",
            name: "bodyZh",
            label: "中文正文段落",
            list: true,
            ui: { component: "textarea" },
          },
          {
            type: "string",
            name: "bodyEn",
            label: "英文正文段落",
            list: true,
            ui: { component: "textarea" },
          },
          {
            type: "rich-text",
            name: "body",
            label: "编辑正文（MDX）",
            isBody: true,
          },
        ],
      },
      {
        name: "issues",
        label: "杂志专题",
        path: "issues",
        format: "json",
        fields: [
          { type: "string", name: "issueId", label: "专题 ID", isTitle: true, required: true },
          { type: "string", name: "titleZh", label: "中文标题", required: true },
          { type: "string", name: "titleEn", label: "英文标题", required: true },
          { type: "string", name: "bodyZh", label: "中文说明", ui: { component: "textarea" } },
          { type: "string", name: "bodyEn", label: "英文说明", ui: { component: "textarea" } },
          { type: "image", name: "coverImage", label: "封面图" },
          { type: "number", name: "articleCount", label: "文章数量" },
        ],
      },
    ],
  },
});
