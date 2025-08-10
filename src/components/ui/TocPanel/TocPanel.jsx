import { useEffect, useState } from "react";
import { isUsable } from "../../../helpers/functions";
import GaTracker from "../../../trackers/ga-tracker";
import Button from "../Buttons/Button";

const TocPanel = ({ rendition, onGoto = () => {}, onSelect = () => {} }) => {
    const [tocItems, setTocItems] = useState([]);

    useEffect(() => {
        if (!isUsable(rendition)) return;
        if (!isUsable(rendition.book)) return;
        rendition.book.loaded.navigation.then(({ toc }) => {
            const toc_ = toc.map((t) => ({ label: t.label, href: t.href }));
            setTocItems(toc_);
        });
    }, [rendition]);

    const renderTOCItems = () => {
        let domItems = [];
        if (!isUsable(rendition)) return "";
        tocItems.forEach((item, i) => {
            domItems.push(
                <div key={i} className="panel__toc__item" onClick={() => gotoTOCItem(`${item.href}`)}>
                    <div className="typo__body typo__body--1">{item.label}</div>
                </div>
            );
        });
        if (domItems.length === 0) domItems.push(<div key="empty" className="panel__empty">No Items</div>);
        return domItems;
    };

    const gotoTOCItem = (cfi) => {
        onSelect();
        GaTracker("event_toc_panel_goto");
        if (!isUsable(rendition)) return;
        rendition.display(cfi);
        rendition.display(cfi);
        onGoto();
    };

    return <div className="panel panel__toc">{renderTOCItems()}</div>;
};

export default TocPanel;
