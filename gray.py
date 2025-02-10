import pandas as pd
import os

def update_gray_areas():
    # Load certificates data
    certificates_file = "certificates.csv"
    if not os.path.exists(certificates_file):
        return
    
    df_certificates = pd.read_csv(certificates_file)

    # Function to calculate recommendations based on certification levels
    recommendations = []
    
    # Count the number of certificates per category per user
    user_cert_counts = df_certificates.groupby(["Name", "Category"]).size().reset_index(name="Count")
    
    for name in df_certificates["Name"].unique():
        user_data = user_cert_counts[user_cert_counts["Name"] == name]

        # Count certification levels
        foundational_count = user_data[user_data["Category"] == "Foundational"]["Count"].sum() if not user_data[user_data["Category"] == "Foundational"].empty else 0
        intermediate_count = user_data[user_data["Category"] == "Intermediate"]["Count"].sum() if not user_data[user_data["Category"] == "Intermediate"].empty else 0
        advanced_count = user_data[user_data["Category"] == "Global"]["Count"].sum() if not user_data[user_data["Category"] == "Global"].empty else 0
        internship_count = user_data[user_data["Category"] == "Internship"]["Count"].sum() if not user_data[user_data["Category"] == "Internship"].empty else 0

        # **Advanced Recommendation Logic**
        recommendation_steps = []

        # 1️⃣ **Balance Learning: Suggest more variety if user is over-focused on one level**
        if foundational_count >= 10 and intermediate_count < 3:
            recommendation_steps.append("You've built a strong foundational base, but consider diversifying by taking Intermediate courses to develop applied skills.")

        if intermediate_count >= 5 and advanced_count < 2:
            recommendation_steps.append("You have solid intermediate knowledge. Consider pursuing at least one Global-level certification to enhance your credibility.")

        if advanced_count >= 3 and internship_count == 0:
            recommendation_steps.append("You're highly skilled at an advanced level! Consider applying this knowledge by engaging in real-world internships.")

        # 2️⃣ **Encourage Practical Experience: If user has high theoretical knowledge but no internships**
        if (foundational_count + intermediate_count + advanced_count) > 15 and internship_count == 0:
            recommendation_steps.append("You've accumulated strong technical knowledge, but gaining real-world exposure through internships can significantly improve your profile.")

        # 3️⃣ **Encourage Multi-Domain Learning**
        if foundational_count > 5 and intermediate_count > 3 and advanced_count == 0:
            recommendation_steps.append("You've covered broad concepts across Foundational and Intermediate levels. Now is the perfect time to specialize by taking Global-level courses.")

        # 4️⃣ **Encourage Leadership Development**
        if internship_count >= 3:
            recommendation_steps.append("You're gaining strong practical exposure through internships! Consider developing leadership skills or pursuing job roles where you can apply your expertise.")

        # 5️⃣ **Provide Personalized Encouragement**
        if not recommendation_steps:
            recommendation_steps.append("You're making great progress! Consider setting a goal to explore advanced concepts or practical experiences.")

        recommendations.append({
            "Name": name,
            "Recommendations": recommendation_steps
        })

    # Convert to DataFrame and save results
    gray_areas_df = pd.DataFrame(recommendations)
    gray_areas_df.to_csv("gray_areas_analysis.csv", index=False)

# Run the gray areas update function
update_gray_areas()
