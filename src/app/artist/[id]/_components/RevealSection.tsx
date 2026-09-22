"use client";

import { motion } from "framer-motion";
import { useContext, type ReactNode } from "react";

import { EditModeContext } from "@/app/_components/EditModeContext";
import styles from "./EditHighlight.module.css";

interface RevealSectionProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    /** Anchor for the post-build tour to scroll to. The tour targets ids so it
     *  needs no knowledge of this page's layout. */
    id?: string;
    editable?: boolean;
}

export default function RevealSection({ children, className, delay = 0, id, editable = false }: RevealSectionProps) {
    const { isEditing, canEdit } = useContext(EditModeContext);
    const highlighted = editable && canEdit && isEditing;
    return (
        <motion.section
            id={id}
            className={[className, highlighted ? styles.highlight : undefined].filter(Boolean).join(" ")}
            data-edit-highlight={highlighted || undefined}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, ease: "easeOut", delay }}
        >
            {children}
        </motion.section>
    );
}
