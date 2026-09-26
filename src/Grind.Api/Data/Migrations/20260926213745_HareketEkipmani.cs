using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class HareketEkipmani : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Equipment",
                table: "Exercises",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 1L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 2L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 3L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 4L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 5L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 6L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 7L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 8L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 9L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 10L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 11L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 12L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 13L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 14L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 15L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 16L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 17L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 18L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 19L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 20L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 21L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 22L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 23L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 24L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 25L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 26L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 27L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 28L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 29L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 30L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 31L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 32L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 33L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 34L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 35L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 36L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 37L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 38L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 39L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 40L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 41L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 42L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 43L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 44L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 45L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 46L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 47L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 48L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 49L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 50L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 51L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 52L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 53L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 54L,
                column: "Equipment",
                value: "Other");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 55L,
                column: "Equipment",
                value: "Other");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 56L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 57L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 58L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 59L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 60L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 61L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 62L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 63L,
                column: "Equipment",
                value: "Other");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 64L,
                column: "Equipment",
                value: "Other");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 65L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 66L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 67L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 68L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 69L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 70L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 71L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 72L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 73L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 74L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 75L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 76L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 77L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 78L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 79L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 80L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 81L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 82L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 83L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 84L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 85L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 86L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 87L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 88L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 89L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 90L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 91L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 92L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 93L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 94L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 95L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 96L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 97L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 98L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 99L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 100L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 101L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 102L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 103L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 104L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 105L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 106L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 107L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 108L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 109L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 110L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 111L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 112L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 113L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 114L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 115L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 116L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 117L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 118L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 119L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 120L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 121L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 122L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 123L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 124L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 125L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 126L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 127L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 128L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 129L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 130L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 131L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 132L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 133L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 134L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 135L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 136L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 137L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 138L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 139L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 140L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 141L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 142L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 143L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 144L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 145L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 146L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 147L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 148L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 149L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 150L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 151L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 152L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 153L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 154L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 155L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 156L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 157L,
                column: "Equipment",
                value: "Dumbbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 158L,
                column: "Equipment",
                value: "Barbell");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 159L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 160L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 161L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 162L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 163L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 164L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 165L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 166L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 167L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 168L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 169L,
                column: "Equipment",
                value: "Cable");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 170L,
                column: "Equipment",
                value: "Bodyweight");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 171L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 172L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 173L,
                column: "Equipment",
                value: "Machine");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 174L,
                column: "Equipment",
                value: "Dumbbell");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Equipment",
                table: "Exercises");
        }
    }
}
