import { Team } from "../types";

/**
 * Oficjalne przypisanie przedziałów wiekowych do grup treningowych GKS Strzegowo:
 * - Wiek poniżej 9 lat -> Grupa U-8
 * - Wiek 9-10 lat -> Grupa U-10
 * - Wiek 11-12 lat -> Grupa U-12
 * - Wiek 13-15 lat -> Grupa U-14
 * - Wiek 16 lat i więcej -> Główny Zespół (Seniorzy)
 */
export const AGE_GROUP_MAPPING = [
	{ maxAge: 8, keyword: "U-8", name: "Juniorzy U-8" },
	{ minAge: 9, maxAge: 10, keyword: "U-10", name: "Juniorzy U-10" },
	{ minAge: 11, maxAge: 12, keyword: "U-12", name: "Juniorzy U-12" },
	{ minAge: 13, maxAge: 15, keyword: "U-14", name: "Juniorzy U-14" },
	{ minAge: 16, keyword: "Senior", name: "Główny Zespół (Seniorzy)" },
];

/**
 * Pomocnicza funkcja znajdująca ID zespołu na podstawie wieku
 */
export const findTeamIdByAge = (ageNum: number, teamsList: Team[]): number | null => {
	if (ageNum < 9) {
		const t = teamsList.find(x => x.name.includes("U-8"));
		if (t) return t.id;
	} else if (ageNum >= 9 && ageNum <= 10) {
		const t = teamsList.find(x => x.name.includes("U-10"));
		if (t) return t.id;
	} else if (ageNum >= 11 && ageNum <= 12) {
		const t = teamsList.find(x => x.name.includes("U-12"));
		if (t) return t.id;
	} else if (ageNum >= 13 && ageNum <= 15) {
		const t = teamsList.find(x => x.name.includes("U-14"));
		if (t) return t.id;
	} else {
		const t = teamsList.find(x => x.name.includes("Senior") || x.name.includes("Główny"));
		if (t) return t.id;
	}
	return teamsList.length > 0 ? teamsList[0].id : null;
};

/**
 * Konwertuje podany wiek (np. 10) lub rok urodzenia (np. 2016) na wiek w latach
 */
export const getAgeFromInput = (input: string): number | null => {
	const val = parseInt(input.trim(), 10);
	if (isNaN(val)) return null;
	const currentYear = new Date().getFullYear();
	if (val >= 1900 && val <= currentYear) {
		return currentYear - val;
	}
	if (val > 0 && val < 100) {
		return val;
	}
	return null;
};
