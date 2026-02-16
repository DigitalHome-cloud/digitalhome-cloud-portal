import * as React from "react";
import { graphql, Link } from "gatsby";
import Layout from "../components/Layout";
import { useTranslation } from "gatsby-plugin-react-i18next";

const BlogPage = ({ data }) => {
  const { t } = useTranslation();
  const posts = data.allMarkdownRemark.nodes;

  return (
    <Layout>
      <main className="dhc-main">
        <h1 className="dhc-page-title">
          {t("blog.title", { defaultValue: "Blog" })}
        </h1>
        <p className="dhc-page-subtitle">
          {t("blog.subtitle", {
            defaultValue:
              "Stories, guides, and updates about DigitalHome.Cloud.",
          })}
        </p>

        <div className="dhc-blog-grid">
          {posts.map((post) => {
            const slug = post.fields.slug;
            return (
              <Link
                key={slug}
                to={slug}
                className="dhc-blog-card"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div className="dhc-tile-body">
                  <h2 className="dhc-tile-title">{post.frontmatter.title}</h2>
                  <p className="dhc-blog-meta">
                    {post.frontmatter.date}
                    {post.frontmatter.author &&
                      ` — ${post.frontmatter.author}`}
                  </p>
                  <p className="dhc-tile-description">{post.excerpt}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
    </Layout>
  );
};

export default BlogPage;

export const query = graphql`
  query BlogPageQuery($language: String!) {
    allMarkdownRemark(sort: { frontmatter: { date: DESC } }) {
      nodes {
        excerpt(pruneLength: 160)
        fields {
          slug
        }
        frontmatter {
          title
          date(formatString: "MMMM DD, YYYY")
          author
        }
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
