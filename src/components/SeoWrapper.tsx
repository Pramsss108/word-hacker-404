import { Helmet } from 'react-helmet-async';

interface SeoProps {
    title: string;
    description: string;
    keywords?: string;
    image?: string;
    url?: string;
    schema?: Record<string, any>;
}

const SeoWrapper = ({
    title,
    description,
    keywords = "youtube downloader, free youtube mp3, 4k video downloader, word hacker tools",
    image = "/og-image.jpg",
    url = "https://wordhacker404.me/tools/youtube-downloader",
    schema
}: SeoProps) => {
    const fullTitle = `${title} | Word Hacker 404`;

    return (
        <Helmet>
            {/* Primary Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="title" content={fullTitle} />
            <meta name="description" content={description} />
            <meta name="keywords" content={keywords} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={url} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:image" content={image} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={url} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={description} />
            <meta property="twitter:image" content={image} />

            {/* Schema.org JSON-LD */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
};

export default SeoWrapper;
