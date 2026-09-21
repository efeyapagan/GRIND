using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class ExpandGlobalExercises : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Exercises",
                columns: new[] { "Id", "Category", "IsArchived", "Name", "UserId" },
                values: new object[,]
                {
                    { 66L, "Push", false, "Incline Barbell Bench Press", null },
                    { 67L, "Push", false, "Decline Barbell Bench Press", null },
                    { 68L, "Push", false, "Flat Dumbbell Bench Press", null },
                    { 69L, "Push", false, "Decline Dumbbell Bench Press", null },
                    { 70L, "Push", false, "Neutral Grip Dumbbell Press", null },
                    { 71L, "Push", false, "Flat Smith Machine Press", null },
                    { 72L, "Push", false, "Incline Smith Machine Press", null },
                    { 73L, "Push", false, "Decline Smith Machine Press", null },
                    { 74L, "Push", false, "Machine Chest Press", null },
                    { 75L, "Push", false, "Incline Machine Chest Press", null },
                    { 76L, "Push", false, "Converging Chest Press", null },
                    { 77L, "Push", false, "Flat Dumbbell Fly", null },
                    { 78L, "Push", false, "Incline Dumbbell Fly", null },
                    { 79L, "Push", false, "Decline Dumbbell Fly", null },
                    { 80L, "Push", false, "High-to-Low Cable Fly", null },
                    { 81L, "Push", false, "Mid-Pulley Cable Fly", null },
                    { 82L, "Push", false, "Low-to-High Cable Fly", null },
                    { 83L, "Push", false, "Pec Deck", null },
                    { 84L, "Push", false, "Push-up", null },
                    { 85L, "Push", false, "Incline Push-up", null },
                    { 86L, "Push", false, "Decline Push-up", null },
                    { 87L, "Push", false, "Deficit Push-up", null },
                    { 88L, "Pull", false, "Close-Grip Lat Pulldown", null },
                    { 89L, "Pull", false, "Reverse Grip Lat Pulldown", null },
                    { 90L, "Pull", false, "Single-Arm Cable Lat Pulldown", null },
                    { 91L, "Pull", false, "Chin-up", null },
                    { 92L, "Pull", false, "Neutral Grip Pull-up", null },
                    { 93L, "Pull", false, "Yates Row", null },
                    { 94L, "Pull", false, "Pendlay Row", null },
                    { 95L, "Pull", false, "Single-Arm Dumbbell Row", null },
                    { 96L, "Pull", false, "Chest-Supported Incline Dumbbell Row", null },
                    { 97L, "Pull", false, "Wide-Grip Seated Cable Row", null },
                    { 98L, "Pull", false, "Single-Arm Seated Cable Row", null },
                    { 99L, "Pull", false, "T-Bar Row", null },
                    { 100L, "Pull", false, "Iso-Lateral Machine Row", null },
                    { 101L, "Legs", false, "Trap Bar Deadlift", null },
                    { 102L, "Legs", false, "Rack Pull", null },
                    { 103L, "Pull", false, "Straight-Arm Cable Pulldown", null },
                    { 104L, "Push", false, "Seated Barbell Overhead Press", null },
                    { 105L, "Push", false, "Behind-the-Neck Press", null },
                    { 106L, "Push", false, "Standing Dumbbell Shoulder Press", null },
                    { 107L, "Push", false, "Arnold Press", null },
                    { 108L, "Push", false, "Seated Smith Machine Overhead Press", null },
                    { 109L, "Push", false, "Plate-Loaded Shoulder Press Machine", null },
                    { 110L, "Push", false, "Pin-Loaded Shoulder Press Machine", null },
                    { 111L, "Push", false, "Standing Dumbbell Lateral Raise", null },
                    { 112L, "Push", false, "Seated Dumbbell Lateral Raise", null },
                    { 113L, "Push", false, "Incline Lean-Away Lateral Raise", null },
                    { 114L, "Push", false, "Cuff Cable Lateral Raise", null },
                    { 115L, "Pull", false, "Reverse Pec Deck", null },
                    { 116L, "Pull", false, "Chest-Supported Incline Dumbbell Rear Delt Fly", null },
                    { 117L, "Pull", false, "Bent-over Dumbbell Rear Delt Raise", null },
                    { 118L, "Pull", false, "Cable Rear Delt Crossover", null },
                    { 119L, "Push", false, "Barbell Front Raise", null },
                    { 120L, "Push", false, "Dumbbell Front Raise", null },
                    { 121L, "Legs", false, "Low-Bar Back Squat", null },
                    { 122L, "Legs", false, "Zercher Squat", null },
                    { 123L, "Legs", false, "Hack Squat", null },
                    { 124L, "Legs", false, "Pendulum Squat", null },
                    { 125L, "Legs", false, "Smith Machine Squat", null },
                    { 126L, "Legs", false, "Bulgarian Split Squat", null },
                    { 127L, "Legs", false, "Walking Lunge", null },
                    { 128L, "Legs", false, "Reverse Lunge", null },
                    { 129L, "Legs", false, "Dumbbell Step-Up", null },
                    { 130L, "Legs", false, "Seated Leg Extension", null },
                    { 131L, "Legs", false, "Sissy Squat", null },
                    { 132L, "Legs", false, "Smith Machine Hip Thrust", null },
                    { 133L, "Legs", false, "Glute Drive Machine", null },
                    { 134L, "Legs", false, "Single-Leg Hip Thrust", null },
                    { 135L, "Legs", false, "Dumbbell Romanian Deadlift", null },
                    { 136L, "Legs", false, "B-Stance Romanian Deadlift", null },
                    { 137L, "Legs", false, "Standing Single-Leg Curl", null },
                    { 138L, "Legs", false, "Standing Calf Raise", null },
                    { 139L, "Legs", false, "Leg Press Calf Raise", null },
                    { 140L, "Pull", false, "EZ-Bar Preacher Curl", null },
                    { 141L, "Pull", false, "Single-Arm Dumbbell Preacher Curl", null },
                    { 142L, "Pull", false, "Machine Preacher Curl", null },
                    { 143L, "Pull", false, "Incline Dumbbell Curl", null },
                    { 144L, "Pull", false, "Concentration Curl", null },
                    { 145L, "Pull", false, "Spider Curl", null },
                    { 146L, "Pull", false, "Standing Dumbbell Hammer Curl", null },
                    { 147L, "Pull", false, "Seated Dumbbell Hammer Curl", null },
                    { 148L, "Pull", false, "Cable Rope Hammer Curl", null },
                    { 149L, "Pull", false, "Reverse Grip Barbell Curl", null },
                    { 150L, "Pull", false, "Low Pulley Cable Curl", null },
                    { 151L, "Pull", false, "High Cable Curl", null },
                    { 152L, "Push", false, "Cable Rope Pushdown", null },
                    { 153L, "Push", false, "Reverse Grip Cable Pushdown", null },
                    { 154L, "Push", false, "Skull Crusher", null },
                    { 155L, "Push", false, "Incline Skull Crusher", null },
                    { 156L, "Push", false, "Decline Skull Crusher", null },
                    { 157L, "Push", false, "Overhead Dumbbell Triceps Extension", null },
                    { 158L, "Push", false, "Close-Grip Bench Press", null },
                    { 159L, "Push", false, "Bench Dips", null },
                    { 160L, "Other", false, "Crunch", null },
                    { 161L, "Other", false, "Decline Bench Crunch", null },
                    { 162L, "Other", false, "Kneeling Cable Crunch", null },
                    { 163L, "Other", false, "Hanging Leg Raise", null },
                    { 164L, "Other", false, "Hanging Knee Raise", null },
                    { 165L, "Other", false, "Captain's Chair Leg Raise", null },
                    { 166L, "Other", false, "Lying Leg Raise", null },
                    { 167L, "Other", false, "Reverse Crunch", null },
                    { 168L, "Other", false, "Plank", null },
                    { 169L, "Other", false, "Cable Pallof Press", null },
                    { 170L, "Other", false, "Russian Twist", null }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 66L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 67L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 68L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 69L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 70L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 71L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 72L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 73L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 74L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 75L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 76L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 77L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 78L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 79L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 80L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 81L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 82L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 83L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 84L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 85L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 86L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 87L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 88L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 89L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 90L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 91L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 92L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 93L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 94L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 95L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 96L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 97L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 98L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 99L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 100L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 101L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 102L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 103L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 104L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 105L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 106L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 107L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 108L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 109L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 110L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 111L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 112L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 113L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 114L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 115L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 116L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 117L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 118L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 119L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 120L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 121L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 122L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 123L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 124L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 125L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 126L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 127L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 128L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 129L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 130L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 131L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 132L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 133L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 134L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 135L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 136L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 137L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 138L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 139L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 140L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 141L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 142L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 143L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 144L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 145L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 146L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 147L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 148L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 149L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 150L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 151L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 152L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 153L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 154L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 155L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 156L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 157L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 158L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 159L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 160L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 161L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 162L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 163L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 164L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 165L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 166L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 167L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 168L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 169L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 170L);
        }
    }
}
