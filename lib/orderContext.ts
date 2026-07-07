import { Dispatch, SetStateAction, createContext, useContext } from 'react';
import { Job, OrderInfo } from './types';

/**
 * Delad arbetsorder mellan besiktnings- och offertvyn: samma jobblista och
 * orderuppgifter, plus ett sätt att hoppa till offerten. Gör att besiktningens
 * anmärkningar kan bli en prissatt jobblista utan att flytta all state.
 */
export type OrderContextValue = {
  jobs: Job[];
  setJobs: Dispatch<SetStateAction<Job[]>>;
  order: OrderInfo;
  setOrder: Dispatch<SetStateAction<OrderInfo>>;
  savedId: string | null;
  setSavedId: Dispatch<SetStateAction<string | null>>;
  goToOrder: () => void;
};

export const OrderContext = createContext<OrderContextValue | null>(null);

export function useOrderContext(): OrderContextValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('OrderContext saknas');
  return ctx;
}
