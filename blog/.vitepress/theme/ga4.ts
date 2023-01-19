// Google Analytics 4
import { Router } from 'vitepress/client';

declare global {
    interface Window { dataLayer: any[]; }
}

export default (_router: Router) => {
    if (typeof window !== 'undefined') {
        // Google analytics integration
        const src = `https://www.googletagmanager.com/gtag/js?id=G-32KR5M2X4E`;
        const gtagScript = document.createElement('script');
        gtagScript.async = true;
        gtagScript.src = src;
        document.head.appendChild(gtagScript);
        window.dataLayer = window.dataLayer || [];
        // seems args has to be type of Arguments
        function gtag(..._args: any[]) { window.dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'G-32KR5M2X4E');
    }
}
