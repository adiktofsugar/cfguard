interface RoutePreviewProps {
    title: string;
    subtitle: string;
    data: unknown;
    children: any;
    onBack: () => void;
}

export default function RoutePreview({ title, subtitle, data, children, onBack }: RoutePreviewProps) {
    return (
        <div>
            <article class="secondary">
                <header>
                    <strong>Dev Mode - {title}</strong>
                    <p>{subtitle}</p>
                </header>
                
                <details>
                    <summary>Backend Data</summary>
                    <pre><code>{JSON.stringify(data, null, 2)}</code></pre>
                </details>
                
                <button onClick={onBack} class="contrast outline">
                    Back to Menu
                </button>
            </article>
            
            {children}
        </div>
    );
}