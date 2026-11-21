import { Dispatch, SetStateAction, createContext, useContext } from 'react';
import type { BikeAnalysisState } from '../components/BikeDetails';
import type { InspectionState } from './inspection';
import { ItemKind, JobComments, Task, OrderInfo, PriceItem } from './types';

/**
 * Delad arbetsorder mellan besiktnings- och offertvyn: samma jobblista och
 * orderuppgifter, plus ett sätt att hoppa till offerten. Gör att besiktningens
 * anmärkningar kan bli en prissatt jobblista utan att flytta all state.
 */
export type OrderContextValue = {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  order: OrderInfo;
  setOrder: Dispatch<SetStateAction<OrderInfo>>;
  goToOrder: () => void;
  /** What the photo shows (Jev); null until a photo is classified. */
  itemKind: ItemKind | null;
  setItemKind: Dispatch<SetStateAction<ItemKind | null>>;
  bikeAnalysis: BikeAnalysisState;
  setBikeAnalysis: Dispatch<SetStateAction<BikeAnalysisState>>;
  /** Price rows that apply to the item kind and bike. */
  prices: PriceItem[];
  /** Besiktning checklist of the current bike; auto-saved with the rest of the job. */
  inspection: InspectionState;
  setInspection: Dispatch<SetStateAction<InspectionState>>;
  /** Spoken text from Besiktning; auto-saved with the job. */
  inspectionTranscript: string;
  setInspectionTranscript: Dispatch<SetStateAction<string>>;
  /** Kundkommentar and Verkstadskommentar; auto-saved with the job. */
  comments: JobComments;
  setComments: Dispatch<SetStateAction<JobComments>>;
  /** True while the Besiktning tab is mid-edit (typing a note, recording);
   *  the Supabase auto-save waits until it ends. */
  holdSave: boolean;
  setHoldSave: Dispatch<SetStateAction<boolean>>;
};

export const OrderContext = createContext<OrderContextValue | null>(null);

export function useOrderContext(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('OrderContext saknas');
  return ctx;
}
