import React, { useState, useEffect } from "react";
import { View, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from "react-native";
import { Card, Title, Paragraph, Text } from "react-native-paper";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../css/colors";

export default function NewsScreen() {
	const [news, setNews] = useState([]);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);

	const fetchNews = async () => {
		try {
			const { data, error } = await supabase
				.from("news")
				.select("*")
				.order("created_at", { ascending: false });

			if (error) throw error;
			setNews(data || []);
		} catch (error) {
			console.error("Error fetching news:", error);
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	};

	useEffect(() => {
		fetchNews();
	}, []);

	const onRefresh = () => {
		setRefreshing(true);
		fetchNews();
	};

	const formatDate = (dateString) => {
		if (!dateString) return "";
		const date = new Date(dateString);
		return date.toLocaleDateString("pl-PL", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		});
	};

	const renderNewsItem = ({ item }) => (
		<Card style={styles.card}>
			<Card.Content>
				<Title style={styles.cardTitle}>{item.title}</Title>
				<Text style={styles.date}>{formatDate(item.created_at)}</Text>
				<Paragraph style={styles.content}>{item.content}</Paragraph>
			</Card.Content>
		</Card>
	);

	if (loading) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator size="large" color={COLORS.primary} />
			</View>
		);
	}

	return (
		<View style={styles.container}>
			<FlatList
				data={news}
				renderItem={renderNewsItem}
				keyExtractor={(item) => item.id.toString()}
				contentContainerStyle={styles.list}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						colors={[COLORS.primary]}
					/>
				}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<Text style={styles.emptyText}>Brak aktualności na ten moment.</Text>
					</View>
				}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: COLORS.background,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: COLORS.background,
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
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: "bold",
		color: COLORS.primary,
		marginBottom: 4,
	},
	date: {
		color: COLORS.textLight,
		fontSize: 12,
		marginBottom: 12,
	},
	content: {
		color: COLORS.textDark,
		lineHeight: 20,
	},
	emptyContainer: {
		padding: 32,
		alignItems: "center",
	},
	emptyText: {
		color: COLORS.textLight,
		fontSize: 15,
	},
});
