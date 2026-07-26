// tina/config.ts
import { defineConfig } from "tinacms";
var branch = process.env.TINA_BRANCH || process.env.GIT_BRANCH || "main";
var clientId = process.env.TINA_PUBLIC_CLIENT_ID || "";
var token = process.env.TINA_TOKEN || "";
var config_default = defineConfig({
  branch,
  clientId,
  token,
  localContentPath: "../content",
  build: {
    outputFolder: "tina",
    publicFolder: "web"
  },
  media: {
    tina: {
      mediaRoot: "assets",
      publicFolder: "web"
    }
  },
  schema: {
    collections: [
      {
        name: "journal",
        label: "\u6742\u5FD7\u6587\u7AE0",
        path: "journal",
        format: "mdx",
        ui: {
          router: ({ document }) => `/journal/?id=${document._sys.filename}`
        },
        fields: [
          { type: "string", name: "titleZh", label: "\u4E2D\u6587\u6807\u9898", isTitle: true, required: true },
          { type: "string", name: "titleEn", label: "\u82F1\u6587\u6807\u9898", required: true },
          {
            type: "string",
            name: "category",
            label: "\u5206\u7C7B",
            required: true,
            options: [
              { label: "\u751F\u6D3B\u65B9\u5F0F", value: "lifestyle" },
              { label: "\u7269\u4EF6", value: "objects" },
              { label: "\u6750\u6599", value: "materials" },
              { label: "\u54C1\u724C", value: "brands" },
              { label: "\u56FD\u5BB6", value: "countries" },
              { label: "\u5DE5\u827A", value: "craft" },
              { label: "\u8BBE\u8BA1\u5E08", value: "designers" },
              { label: "\u6742\u5FD7\u4E13\u9898", value: "issues" }
            ]
          },
          { type: "string", name: "categoryZh", label: "\u4E2D\u6587\u5206\u7C7B\u540D" },
          { type: "string", name: "categoryEn", label: "\u82F1\u6587\u5206\u7C7B\u540D" },
          { type: "image", name: "coverImage", label: "\u5C01\u9762\u56FE" },
          { type: "string", name: "excerptZh", label: "\u4E2D\u6587\u6458\u8981", ui: { component: "textarea" } },
          { type: "string", name: "excerptEn", label: "\u82F1\u6587\u6458\u8981", ui: { component: "textarea" } },
          { type: "string", name: "authorZh", label: "\u4E2D\u6587\u4F5C\u8005" },
          { type: "string", name: "authorEn", label: "\u82F1\u6587\u4F5C\u8005" },
          { type: "datetime", name: "publishedAt", label: "\u53D1\u5E03\u65F6\u95F4" },
          { type: "number", name: "readingTime", label: "\u9605\u8BFB\u65F6\u95F4\uFF08\u5206\u949F\uFF09" },
          { type: "boolean", name: "requiresMembership", label: "\u9700\u8981\u4F1A\u5458\u6743\u9650" },
          { type: "string", name: "issue", label: "\u6240\u5C5E\u4E13\u9898 ID" },
          { type: "string", name: "collection", label: "\u6240\u5C5E Collection ID" },
          {
            type: "string",
            name: "relatedProductIds",
            label: "\u5173\u8054\u5546\u54C1 ID",
            list: true
          },
          {
            type: "string",
            name: "bodyZh",
            label: "\u4E2D\u6587\u6B63\u6587\u6BB5\u843D",
            list: true,
            ui: { component: "textarea" }
          },
          {
            type: "string",
            name: "bodyEn",
            label: "\u82F1\u6587\u6B63\u6587\u6BB5\u843D",
            list: true,
            ui: { component: "textarea" }
          },
          {
            type: "rich-text",
            name: "body",
            label: "\u7F16\u8F91\u6B63\u6587\uFF08MDX\uFF09",
            isBody: true
          }
        ]
      },
      {
        name: "issues",
        label: "\u6742\u5FD7\u4E13\u9898",
        path: "issues",
        format: "json",
        fields: [
          { type: "string", name: "issueId", label: "\u4E13\u9898 ID", isTitle: true, required: true },
          { type: "string", name: "titleZh", label: "\u4E2D\u6587\u6807\u9898", required: true },
          { type: "string", name: "titleEn", label: "\u82F1\u6587\u6807\u9898", required: true },
          { type: "string", name: "bodyZh", label: "\u4E2D\u6587\u8BF4\u660E", ui: { component: "textarea" } },
          { type: "string", name: "bodyEn", label: "\u82F1\u6587\u8BF4\u660E", ui: { component: "textarea" } },
          { type: "image", name: "coverImage", label: "\u5C01\u9762\u56FE" },
          { type: "number", name: "articleCount", label: "\u6587\u7AE0\u6570\u91CF" }
        ]
      }
    ]
  }
});
export {
  config_default as default
};
