import { render } from "preact";
import { useEffect, useMemo } from "preact/hooks";
import AppStore from "./AppStore";

function App() {
    const store = useMemo(() => new AppStore(), []);
    useEffect(() => {
        store.fetch();
    }, []);
    if (store.pending.value) return <p>Loading</p>;
    if (store.error.value)
        return (
            <div>
                <p>Error: ${store.error}</p>
            </div>
        );
    if (store.data.value) {
        return (
            <div>
                <p>Api response</p>
                <pre>{store.data}</pre>
            </div>
        );
    }
    return null;
}

const el = document.getElementById("app");
if (!el) {
    throw new Error(`Element with id "app" does not exist`);
}
render(<App />, el);
