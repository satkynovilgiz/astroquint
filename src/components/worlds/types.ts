import type { Answer, PublicQuestionFor, Reveal } from "@/features/questions/types";
import type { WorldDefinition } from "@/features/worlds/worlds";
import type { WorldId } from "@/features/worlds/worlds";

export interface WorldProps<W extends WorldId> {
  question: PublicQuestionFor<W>;
  world: WorldDefinition;
  /** Locked: answer submitted or time up. */
  locked: boolean;
  submitted: Answer | null;
  reveal: Reveal | null;
  onSubmit: (answer: Answer) => void;
}
