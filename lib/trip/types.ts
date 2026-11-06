// Field names mirror the four worksheets. Row order is the itinerary order.
export type TripSettings = {
  tripName: string;
  subtitle: string;
  startDate: string;
  endDate: string;
  themeColor: string;
  language?: 'zh-TW' | 'en';
};
export type ItineraryRow = { Date: string; Activity: string; MapURL: string };
export type AccommodationRow = {
  Name: string;
  City: string;
  CheckIn: string;
  CheckOut: string;
  MapURL: string;
};
export type TransportationRow = {
  Type: 'Flight' | 'Train' | 'Bus' | 'Other';
  From: string;
  To: string;
  DepartureDate: string;
  DepartureTime: string;
  ArrivalDate: string;
  ArrivalTime: string;
  Carrier: string;
  Number: string;
};
export type SyncState = 'disconnected' | 'saving' | 'synced' | 'error';
