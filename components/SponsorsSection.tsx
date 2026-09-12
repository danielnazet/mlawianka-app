import React, { useEffect, useState } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Linking,
	Image,
	Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { Sponsor } from "../types";
import { COLORS } from "../css/colors";
import { FONTS } from "../css/fonts";

interface SponsorsSectionProps {
	compact?: boolean;
}

export default function SponsorsSection({ compact = false }: SponsorsSectionProps) {
	const [sponsors, setSponsors] = useState<Sponsor[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		loadSponsors();
	}, []);

	const loadSponsors = async () => {
		try {
			const { data, error } = await supabase
				.from("sponsors")
				.select("*")
				.eq("is_active", true)
				.order("display_order", { ascending: true });

			if (error) throw error;
			setSponsors(data || []);
		} catch (err) {
			console.error("Błąd podczas ładowania sponsorów:", err);
		} finally {
			setLoading(false);
		}
	};

	const handleOpenUrl = async (url?: string | null) => {
		if (!url) return;
		try {
			let formattedUrl = url.trim();
			if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
				formattedUrl = `https://${formattedUrl}`;
			}
			const supported = await Linking.canOpenURL(formattedUrl);
			if (supported) {
				await Linking.openURL(formattedUrl);
			} else {
				Alert.alert("Błąd", "Nie można otworzyć tego adresu URL.");
			}
		} catch (e) {
			console.warn("Błąd otwierania URL sponsora:", e);
		}
	};

	const handleContactClub = () => {
		Alert.alert(
			"Zostań Sponsorem GKS",
			"Skontaktuj się z zarządem klubu GKS Strzegowo, aby porozmawiać o pakietach sponsorskich i promocji Twojej firmy w aplikacji oraz na stadionie.\n\nE-mail: kontakt@gksstrzegowo.pl\nTel: +48 23 679 10 20",
			[
				{
					text: "Napisz E-mail",
					onPress: () => Linking.openURL("mailto:kontakt@gksstrzegowo.pl?subject=Wspolpraca Sponsorska GKS Strzegowo"),
				},
				{
					text: "Zadzwoń",
					onPress: () => Linking.openURL("tel:+48236791020"),
				},
				{ text: "Zamknij", style: "cancel" },
			]
		);
	};

	if (loading) {
		return null;
	}

	if (sponsors.length === 0) {
		return null;
	}

	const mainSponsors = sponsors.filter((s) => s.category === "main");
	const strategicSponsors = sponsors.filter((s) => s.category === "strategic");
	const regularPartners = sponsors.filter((s) => s.category === "partner");

	return (
		<View style={styles.container}>
			{/* Nagłówek Sekcji */}
			<View style={styles.headerRow}>
				<LinearGradient
					colors={["#D4AF37", "#F3E5AB"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.goldBadgeIcon}
				>
					<MaterialCommunityIcons name="star-shooting" size={20} color="#1E293B" />
				</LinearGradient>
				<View style={styles.headerTextWrap}>
					<Text style={styles.sectionOverline}>OFICJALNI PARTNERZY</Text>
					<Text style={styles.sectionTitle}>Sponsorzy GKS Strzegowo</Text>
				</View>
			</View>

			<Text style={styles.sectionSubtitle}>
				Dziękujemy instytucjom i firmom, które wspierają rozwój sportowy dzieci i seniorów naszego klubu.
			</Text>

			{/* SPONSOR GŁÓWNY (HERO CARD) */}
			{mainSponsors.map((item) => (
				<TouchableOpacity
					key={item.id}
					activeOpacity={item.website_url ? 0.85 : 1}
					onPress={() => item.website_url && handleOpenUrl(item.website_url)}
					style={styles.mainSponsorCardWrapper}
				>
					<LinearGradient
						colors={["#1E293B", "#0F172A"]}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.mainSponsorCard}
					>
						{/* Złota wstęga */}
						<LinearGradient
							colors={["#F59E0B", "#D97706"]}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 0 }}
							style={styles.mainRibbon}
						>
							<MaterialCommunityIcons name="crown" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
							<Text style={styles.mainRibbonText}>SPONSOR TYTULARNY / GŁÓWNY</Text>
						</LinearGradient>

						<View style={styles.mainContentRow}>
							{item.logo_url ? (
								<Image source={{ uri: item.logo_url }} style={styles.mainLogo} resizeMode="contain" />
							) : (
								<LinearGradient
									colors={["#FDE68A", "#D97706"]}
									style={styles.mainLogoPlaceholder}
								>
									<MaterialCommunityIcons name="bank" size={28} color="#1E293B" />
								</LinearGradient>
							)}

							<View style={styles.mainInfoCol}>
								<Text style={styles.mainName}>{item.name}</Text>
								{item.description ? (
									<Text style={styles.mainDesc} numberOfLines={2}>
										{item.description}
									</Text>
								) : null}
							</View>
						</View>

						{item.website_url ? (
							<View style={styles.mainActionRow}>
								<Text style={styles.mainActionText}>Odwiedź stronę partnera</Text>
								<MaterialCommunityIcons name="arrow-right-circle" size={18} color="#FBBF24" />
							</View>
						) : null}
					</LinearGradient>
				</TouchableOpacity>
			))}

			{/* PARTNERZY STRATEGICZNI */}
			{strategicSponsors.length > 0 && (
				<View style={styles.subCategorySection}>
					<View style={styles.subCatHeader}>
						<MaterialCommunityIcons name="shield-star" size={16} color={COLORS.primary} />
						<Text style={styles.subCatTitle}>PARTNERZY STRATEGICZNI</Text>
					</View>

					<View style={styles.gridContainer}>
						{strategicSponsors.map((item) => (
							<TouchableOpacity
								key={item.id}
								activeOpacity={item.website_url ? 0.8 : 1}
								onPress={() => item.website_url && handleOpenUrl(item.website_url)}
								style={styles.strategicCard}
							>
								<View style={styles.strategicIconContainer}>
									<MaterialCommunityIcons
										name={item.name.toLowerCase().includes("gmina") ? "town-hall" : "car-sports"}
										size={24}
										color={COLORS.primary}
									/>
								</View>
								<Text style={styles.strategicName} numberOfLines={1}>
									{item.name}
								</Text>
								{item.description ? (
									<Text style={styles.strategicDesc} numberOfLines={2}>
										{item.description}
									</Text>
								) : null}
								{item.website_url ? (
									<View style={styles.linkRow}>
										<Text style={styles.linkText}>Zobacz więcej</Text>
										<MaterialCommunityIcons name="open-in-new" size={13} color={COLORS.primary} />
									</View>
								) : null}
							</TouchableOpacity>
						))}
					</View>
				</View>
			)}

			{/* PARTNERZY I DARCZYŃCY */}
			{regularPartners.length > 0 && (
				<View style={styles.subCategorySection}>
					<View style={styles.subCatHeader}>
						<MaterialCommunityIcons name="handshake-outline" size={16} color={COLORS.textLight} />
						<Text style={[styles.subCatTitle, { color: COLORS.textLight }]}>PARTNERZY I DARCZYŃCY</Text>
					</View>

					<View style={styles.chipsRow}>
						{regularPartners.map((item) => (
							<TouchableOpacity
								key={item.id}
								activeOpacity={0.8}
								onPress={() => {
									if (item.website_url) {
										handleOpenUrl(item.website_url);
									} else if (item.phone) {
										Linking.openURL(`tel:${item.phone}`);
									}
								}}
								style={styles.partnerChip}
							>
								<MaterialCommunityIcons
									name={
										item.name.toLowerCase().includes("pizza") || item.name.toLowerCase().includes("restauracja")
											? "pizza"
											: "hospital-building"
									}
									size={16}
									color={COLORS.primary}
									style={{ marginRight: 6 }}
								/>
								<Text style={styles.partnerChipText}>{item.name}</Text>
								{item.website_url ? (
									<MaterialCommunityIcons name="chevron-right" size={16} color={COLORS.textLight} />
								) : null}
							</TouchableOpacity>
						))}
					</View>
				</View>
			)}

			{/* BANNER CTA - ZOSTAŃ PARTNEREM KLUBU */}
			<TouchableOpacity
				activeOpacity={0.9}
				onPress={handleContactClub}
				style={styles.ctaWrapper}
			>
				<LinearGradient
					colors={[COLORS.primaryDark, COLORS.primary]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 1 }}
					style={styles.ctaCard}
				>
					<View style={styles.ctaContent}>
						<View style={styles.ctaIconBadge}>
							<MaterialCommunityIcons name="handshake" size={24} color={COLORS.white} />
						</View>
						<View style={styles.ctaTextCol}>
							<Text style={styles.ctaTitle}>Zostań Sponsorem GKS</Text>
							<Text style={styles.ctaSubtitle}>
								Promuj swoją firmę wśród setek kibiców i rodzin z gminy Strzegowo.
							</Text>
						</View>
					</View>
					<View style={styles.ctaBtn}>
						<Text style={styles.ctaBtnText}>Dołącz do nas</Text>
						<MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.primary} />
					</View>
				</LinearGradient>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		marginTop: 24,
		marginBottom: 32,
		paddingHorizontal: 16,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 6,
	},
	goldBadgeIcon: {
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 10,
		shadowColor: "#D4AF37",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 3,
	},
	headerTextWrap: {
		flex: 1,
	},
	sectionOverline: {
		fontSize: 11,
		fontFamily: FONTS.bold,
		color: "#D97706",
		letterSpacing: 1.2,
		textTransform: "uppercase",
	},
	sectionTitle: {
		fontSize: 18,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
	},
	sectionSubtitle: {
		fontSize: 13,
		fontFamily: FONTS.regular,
		color: COLORS.textLight,
		marginBottom: 16,
		lineHeight: 18,
	},
	mainSponsorCardWrapper: {
		marginBottom: 16,
		borderRadius: 16,
		overflow: "hidden",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		elevation: 5,
		borderWidth: 1.5,
		borderColor: "#F59E0B",
	},
	mainSponsorCard: {
		padding: 16,
		paddingTop: 12,
	},
	mainRibbon: {
		flexDirection: "row",
		alignItems: "center",
		alignSelf: "flex-start",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 6,
		marginBottom: 12,
	},
	mainRibbonText: {
		color: "#FFFFFF",
		fontSize: 10,
		fontFamily: FONTS.bold,
		letterSpacing: 0.8,
	},
	mainContentRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	mainLogo: {
		width: 54,
		height: 54,
		borderRadius: 12,
		backgroundColor: "#FFFFFF",
		marginRight: 14,
	},
	mainLogoPlaceholder: {
		width: 54,
		height: 54,
		borderRadius: 12,
		justifyContent: "center",
		alignItems: "center",
		marginRight: 14,
	},
	mainInfoCol: {
		flex: 1,
	},
	mainName: {
		color: "#FFFFFF",
		fontSize: 16,
		fontFamily: FONTS.bold,
		marginBottom: 2,
	},
	mainDesc: {
		color: "#94A3B8",
		fontSize: 12,
		fontFamily: FONTS.regular,
		lineHeight: 16,
	},
	mainActionRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "flex-end",
		marginTop: 12,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: "rgba(255,255,255,0.1)",
	},
	mainActionText: {
		color: "#FBBF24",
		fontSize: 12,
		fontFamily: FONTS.bold,
		marginRight: 6,
	},
	subCategorySection: {
		marginBottom: 16,
	},
	subCatHeader: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
	},
	subCatTitle: {
		fontSize: 12,
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		marginLeft: 6,
		letterSpacing: 0.8,
	},
	gridContainer: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		gap: 10,
	},
	strategicCard: {
		width: "48%",
		backgroundColor: COLORS.white,
		borderRadius: 14,
		padding: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
		elevation: 2,
	},
	strategicIconContainer: {
		width: 40,
		height: 40,
		borderRadius: 10,
		backgroundColor: "#EFF6FF",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 8,
	},
	strategicName: {
		fontSize: 14,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginBottom: 2,
	},
	strategicDesc: {
		fontSize: 11,
		fontFamily: FONTS.regular,
		color: COLORS.textLight,
		lineHeight: 15,
		marginBottom: 8,
	},
	linkRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: "auto",
	},
	linkText: {
		fontSize: 11,
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		marginRight: 4,
	},
	chipsRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	partnerChip: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: COLORS.white,
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	partnerChipText: {
		fontSize: 12,
		fontFamily: FONTS.medium,
		color: COLORS.textDark,
		marginRight: 4,
	},
	ctaWrapper: {
		marginTop: 8,
		borderRadius: 16,
		overflow: "hidden",
		shadowColor: COLORS.primary,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.25,
		shadowRadius: 6,
		elevation: 4,
	},
	ctaCard: {
		padding: 16,
		borderRadius: 16,
	},
	ctaContent: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 12,
	},
	ctaIconBadge: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: "rgba(255,255,255,0.2)",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 12,
	},
	ctaTextCol: {
		flex: 1,
	},
	ctaTitle: {
		fontSize: 16,
		fontFamily: FONTS.bold,
		color: COLORS.white,
		marginBottom: 2,
	},
	ctaSubtitle: {
		fontSize: 12,
		fontFamily: FONTS.regular,
		color: "rgba(255,255,255,0.85)",
		lineHeight: 16,
	},
	ctaBtn: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.white,
		borderRadius: 10,
		paddingVertical: 9,
		paddingHorizontal: 16,
	},
	ctaBtnText: {
		fontSize: 13,
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		marginRight: 6,
	},
});
