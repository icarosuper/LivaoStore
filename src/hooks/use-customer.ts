"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "livao_customer";
const CUSTOMER_CHANGED = "livao_customer_changed";

type CustomerData = { name: string; whatsapp: string };

function readFromStorage(): CustomerData | null {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return stored ? (JSON.parse(stored) as CustomerData) : null;
	} catch {
		return null;
	}
}

export function useCustomer() {
	const [customer, setCustomer] = useState<CustomerData | null>(null);

	useEffect(() => {
		setCustomer(readFromStorage());

		function onChanged() {
			setCustomer(readFromStorage());
		}

		window.addEventListener(CUSTOMER_CHANGED, onChanged);
		return () => window.removeEventListener(CUSTOMER_CHANGED, onChanged);
	}, []);

	function saveCustomer(data: CustomerData) {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		setCustomer(data);
		window.dispatchEvent(new Event(CUSTOMER_CHANGED));
	}

	function clearCustomer() {
		localStorage.removeItem(STORAGE_KEY);
		setCustomer(null);
		window.dispatchEvent(new Event(CUSTOMER_CHANGED));
	}

	return { customer, saveCustomer, clearCustomer };
}
