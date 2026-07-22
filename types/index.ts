export type Fit = "Reach" | "Target" | "Strong fit" | "Research needed";
export interface Athlete { name:string; gradYear:number; province:string; school:string; event:string; personalBest:string; average:number; major:string; }
export interface School { id:string; name:string; location:string; system:"NCAA"|"U Sports"; division:string; conference:string; size:string; academics:string[]; fit:Fit; overview:string; }
export interface Task { id:number; title:string; detail:string; }
export interface Outreach { id:number; school:string; coach:string; contacted:string; method:string; status:string; followUp:string; notes:string; }
