import { SessionData } from "../../types";

export interface StepProps {
    data: SessionData;
    update: (fn: (current: SessionData) => SessionData) => void;
}
