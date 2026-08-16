import { StyleSheet, Dimensions } from "react-native";
import { COLORS } from "./colors";
import { FONTS } from "./fonts";

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	backgroundImageStyle: {
		opacity: 0.08,
		resizeMode: "cover",
		width: "100%",
		height: "100%",
		position: "absolute",
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: COLORS.background,
	},
	tabContainer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 4,
	},
	segmentedButtons: {
		borderRadius: 8,
	},
	activeTabButton: {
		backgroundColor: COLORS.primary,
	},
	inactiveTabButton: {
		backgroundColor: COLORS.white,
	},
	list: {
		padding: 16,
	},
	card: {
		marginBottom: 16,
		backgroundColor: COLORS.white,
		borderRadius: 12,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 2,
		borderLeftWidth: 4,
		borderLeftColor: COLORS.primary,
	},
	announcementCard: {
		borderLeftColor: COLORS.success,
	},
	badgeRow: {
		flexDirection: "row",
		marginBottom: 6,
	},
	newsBadge: {
		fontSize: 10,
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		backgroundColor: COLORS.primaryLight,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
	},
	announcementBadge: {
		fontSize: 10,
		fontFamily: FONTS.bold,
		color: COLORS.success,
		backgroundColor: "#e6fbf3",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
	},
	cardTitle: {
		fontSize: 18,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginBottom: 4,
	},
	date: {
		color: COLORS.textLight,
		fontSize: 12,
		marginBottom: 12,
		fontFamily: FONTS.regular,
	},
	sender: {
		color: COLORS.textLight,
		fontSize: 12,
		fontFamily: FONTS.semiBold,
		marginBottom: 12,
	},
	content: {
		color: COLORS.textDark,
		lineHeight: 20,
		fontSize: 14,
		fontFamily: FONTS.regular,
	},
	emptyContainer: {
		padding: 32,
		alignItems: "center",
	},
	emptyText: {
		color: COLORS.textLight,
		fontSize: 15,
		fontFamily: FONTS.regular,
	},
	guestContainer: {
		flex: 1,
		justifyContent: "center",
		padding: 24,
	},
	guestCard: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		padding: 16,
		elevation: 4,
	},
	guestContent: {
		alignItems: "center",
	},
	guestTitle: {
		color: COLORS.primary,
		fontFamily: FONTS.bold,
		fontSize: 20,
		marginBottom: 8,
	},
	guestDescription: {
		textAlign: "center",
		color: COLORS.textLight,
		marginBottom: 20,
		fontSize: 14,
		lineHeight: 20,
		fontFamily: FONTS.regular,
	},
	guestButton: {
		backgroundColor: COLORS.primary,
		width: "100%",
		borderRadius: 8,
	},
	guestButtonLabel: {
		fontFamily: FONTS.bold,
		color: COLORS.white,
	},

	// Stylizacja dla wyróżnionego (featured) newsa
	featuredCard: {
		backgroundColor: COLORS.white,
		borderRadius: 12,
		overflow: "hidden",
		elevation: 3,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.1,
		shadowRadius: 10,
	},
	featuredCover: {
		width: "100%",
		height: 180,
		borderTopLeftRadius: 12,
		borderTopRightRadius: 12,
	},
	featuredContent: {
		padding: 16,
	},
	featuredBadge: {
		fontSize: 10,
		fontFamily: FONTS.bold,
		color: COLORS.white,
		backgroundColor: COLORS.primary,
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 4,
	},
	featuredTitle: {
		fontSize: 20,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginTop: 4,
		marginBottom: 2,
	},
	featuredContentText: {
		color: COLORS.textDark,
		lineHeight: 20,
		fontSize: 14,
		fontFamily: FONTS.regular,
	},

	// Stylizacja dla małych newsów w stylu Flashscore
	smallCard: {
		backgroundColor: COLORS.white,
		borderRadius: 12,
		elevation: 1,
		overflow: "hidden",
	},
	horizontalRow: {
		flexDirection: "row",
		padding: 10,
		alignItems: "center",
	},
	smallCover: {
		width: 80,
		height: 80,
		backgroundColor: COLORS.border,
	},
	smallCardTextContent: {
		flex: 1,
		marginLeft: 12,
		justifyContent: "center",
	},
	smallBadgeRow: {
		flexDirection: "row",
		marginBottom: 2,
	},
	smallNewsBadge: {
		fontSize: 9,
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		backgroundColor: COLORS.primaryLight,
		paddingHorizontal: 6,
		paddingVertical: 1,
		borderRadius: 3,
	},
	smallCardTitle: {
		fontSize: 14,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		lineHeight: 18,
		marginBottom: 2,
		marginTop: 2,
	},
	smallCardDate: {
		color: COLORS.textLight,
		fontSize: 11,
		fontFamily: FONTS.regular,
	},

	// Dialog dla szczegółów aktualności
	dialogTitle: {
		fontSize: 18,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
	},
	dialogContent: {
		paddingTop: 0,
	},
	dialogScroll: {
		maxHeight: 400,
	},
	dialogCover: {
		height: 160,
		marginBottom: 12,
		width: "100%",
	},
	dialogDate: {
		color: COLORS.textLight,
		fontSize: 12,
		marginBottom: 8,
		fontFamily: FONTS.semiBold,
	},
	dialogText: {
		color: COLORS.textDark,
		fontSize: 14,
		lineHeight: 22,
		fontFamily: FONTS.regular,
	},

	// Formularz dodawania postów
	fab: {
		position: "absolute",
		margin: 16,
		right: 16,
		bottom: 80, // Zwiększone pod fab dla odsunięcia od pływającego paska dolnego
		backgroundColor: COLORS.primary,
		borderRadius: 28,
		elevation: 6,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.27,
		shadowRadius: 4.65,
	},
	dialogScrollForm: {
		maxHeight: Dimensions.get("window").height * 0.58,
	},
	formInput: {
		marginBottom: 12,
		backgroundColor: COLORS.white,
	},
	formButton: {
		backgroundColor: COLORS.primary,
	},
	switchRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginTop: 8,
		marginBottom: 12,
		paddingVertical: 4,
	},
	switchLabel: {
		fontSize: 14,
		color: COLORS.textDark,
		flex: 1,
		paddingRight: 10,
		fontFamily: FONTS.regular,
	},
	pickerContainer: {
		marginTop: 12,
		marginBottom: 8,
	},
	pickerLabel: {
		fontSize: 14,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginBottom: 6,
	},
	teamChipsScroll: {
		flexDirection: "row",
		paddingVertical: 4,
	},
	teamChip: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: COLORS.background,
		marginRight: 8,
		borderWidth: 1,
		borderColor: COLORS.border,
	},
	teamChipActive: {
		backgroundColor: COLORS.primaryLight,
		borderColor: COLORS.primary,
	},
	teamChipText: {
		fontSize: 12,
		color: COLORS.textDark,
		fontFamily: FONTS.regular,
	},
	teamChipTextActive: {
		color: COLORS.primary,
		fontFamily: FONTS.bold,
	},

	// Upload i podgląd zdjęć
	uploadZone: {
		borderWidth: 1.5,
		borderColor: COLORS.border,
		borderStyle: "dashed",
		borderRadius: 12,
		padding: 16,
		alignItems: "center",
		backgroundColor: COLORS.background,
		marginBottom: 16,
		marginTop: 4,
	},
	uploadZoneTitle: {
		fontSize: 13,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
		marginBottom: 2,
	},
	uploadZoneSubtitle: {
		fontSize: 11,
		color: COLORS.textLight,
		marginBottom: 12,
		fontFamily: FONTS.regular,
	},
	uploadZoneButtons: {
		flexDirection: "row",
		justifyContent: "space-between",
		width: "100%",
	},
	uploadZoneBtn: {
		flex: 0.47,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: COLORS.white,
		borderWidth: 1,
		borderColor: COLORS.border,
		borderRadius: 8,
		paddingVertical: 10,
		elevation: 1,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 1,
	},
	uploadZoneBtnText: {
		fontSize: 12,
		fontFamily: FONTS.bold,
		color: COLORS.primary,
		marginLeft: 6,
	},
	imagePreviewContainer: {
		width: "100%",
		height: 160,
		borderRadius: 12,
		overflow: "hidden",
		marginBottom: 16,
		marginTop: 4,
		position: "relative",
	},
	imagePreview: {
		width: "100%",
		height: "100%",
		resizeMode: "cover",
	},
	removeImageButton: {
		position: "absolute",
		top: 10,
		right: 10,
		backgroundColor: "rgba(239, 68, 68, 0.9)",
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		elevation: 2,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.25,
		shadowRadius: 3.84,
	},
	removeImageText: {
		color: COLORS.white,
		fontSize: 12,
		fontFamily: FONTS.bold,
		marginLeft: 4,
	},
	uploadingContainer: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	uploadingText: {
		fontSize: 13,
		color: COLORS.textDark,
		marginLeft: 8,
		fontFamily: FONTS.regular,
	},

	// Stylizacja opcji (switches)
	settingsGroup: {
		backgroundColor: COLORS.background,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: COLORS.border,
		marginBottom: 16,
		overflow: "hidden",
	},
	settingRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		padding: 12,
	},
	settingTextContainer: {
		flex: 1,
		paddingRight: 10,
	},
	settingLabel: {
		fontSize: 13,
		fontFamily: FONTS.bold,
		color: COLORS.textDark,
	},
	settingDescription: {
		fontSize: 11,
		color: COLORS.textLight,
		marginTop: 1,
		fontFamily: FONTS.regular,
	},

	// Layouty modalów i przycisków
	dialogContainer: {
		backgroundColor: COLORS.white,
		borderRadius: 16,
		width: "92%",
		alignSelf: "center",
		paddingVertical: 4,
	},
	formActionsRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 24,
		paddingBottom: 16,
		paddingTop: 8,
	},
	cancelBtn: {
		flex: 0.47,
		borderRadius: 8,
		borderColor: COLORS.border,
	},
	submitBtn: {
		flex: 0.47,
		borderRadius: 8,
		backgroundColor: COLORS.primary,
	},

	// Kontenery gestów swipe do edycji/usuwania
	swipeActionsContainerFeatured: {
		flexDirection: "row",
		width: 140,
		height: "100%",
		overflow: "hidden",
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
	},
	swipeActionsContainerSmall: {
		flexDirection: "row",
		width: 140,
		height: "100%",
		overflow: "hidden",
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
	},
	swipeActionBtn: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		height: "100%",
	},
	editActionBtn: {
		backgroundColor: COLORS.primary,
	},
	deleteActionBtn: {
		backgroundColor: "#ef4444",
		borderTopRightRadius: 12,
		borderBottomRightRadius: 12,
	},
	swipeActionText: {
		color: COLORS.white,
		fontSize: 11,
		fontFamily: FONTS.bold,
		marginTop: 4,
	},
});
