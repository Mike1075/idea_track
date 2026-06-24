import { makeStageHandler } from "@/lib/route";
import { PROMPTS } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = makeStageHandler(PROMPTS.expand);
