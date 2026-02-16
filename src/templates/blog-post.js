import * as React from "react";
import { graphql, Link } from "gatsby";
import Layout from "../components/Layout";
import { useTranslation } from "gatsby-plugin-react-i18next";

const BlogPostTemplate = ({ data }) => {
  const { t } = useTranslation();
  const post = data.markdownRemark;

  return (
    <Layout>
      <main className="dhc-main">
        <article className="dhc-article">
          <header>
            <h1 className="dhc-page-title">{post.frontmatter.title}</h1>
            <p className="dhc-blog-meta">
              {post.frontmatter.date}
              {post.frontmatter.author && ` — ${post.frontmatter.author}`}
            </p>
          </header>
          <div
            className="dhc-text-section"
            dangerouslySetInnerHTML={{ __html: post.html }}
          />
          <Link to="/blog" className="dhc-back-link">
            {t("blog.backToList", { defaultValue: "Back to blog" })}
          </Link>
        </article>
      </main>
    </Layout>
  );
};

export default BlogPostTemplate;

export const query = graphql`
  query BlogPostQuery($id: String!, $language: String!) {
    markdownRemark(id: { eq: $id }) {
      html
      frontmatter {
        title
        date(formatString: "MMMM DD, YYYY")
        author
        description
      }
    }
    locales: allLocale(filter: { language: { eq: $language } }) {
      edges {
        node {
          ns
          data
          language
        }
      }
    }
  }
`;
