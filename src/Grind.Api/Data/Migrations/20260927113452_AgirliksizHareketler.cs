using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AgirliksizHareketler : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_SetEntry_Reps_Positive",
                table: "SetEntries");

            migrationBuilder.AlterColumn<int>(
                name: "Reps",
                table: "SetEntries",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "DurationSeconds",
                table: "SetEntries",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Measurement",
                table: "Exercises",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 1L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 2L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 3L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 4L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 5L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 6L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 7L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 8L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 9L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 10L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 11L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 12L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 13L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 14L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 15L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 16L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 17L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 18L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 19L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 20L,
                column: "Measurement",
                value: "Reps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 21L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 22L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 23L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 24L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 25L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 26L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 27L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 28L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 29L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 30L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 31L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 32L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 33L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 34L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 35L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 36L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 37L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 38L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 39L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 40L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 41L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 42L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 43L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 44L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 45L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 46L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 47L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 48L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 49L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 50L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 51L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 52L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 53L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 54L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 55L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 56L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 57L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 58L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 59L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 60L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 61L,
                column: "Measurement",
                value: "Duration");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 62L,
                column: "Measurement",
                value: "Reps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 63L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 64L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 65L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 66L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 67L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 68L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 69L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 70L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 71L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 72L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 73L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 74L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 75L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 76L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 77L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 78L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 79L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 80L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 81L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 82L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 83L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 84L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 85L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 86L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 87L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 88L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 89L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 90L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 91L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 92L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 93L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 94L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 95L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 96L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 97L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 98L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 99L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 100L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 101L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 102L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 103L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 104L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 105L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 106L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 107L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 108L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 109L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 110L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 111L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 112L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 113L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 114L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 115L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 116L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 117L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 118L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 119L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 120L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 121L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 122L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 123L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 124L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 125L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 126L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 127L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 128L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 129L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 130L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 131L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 132L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 133L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 134L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 135L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 136L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 137L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 138L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 139L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 140L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 141L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 142L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 143L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 144L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 145L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 146L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 147L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 148L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 149L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 150L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 151L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 152L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 153L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 154L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 155L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 156L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 157L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 158L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 159L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 160L,
                column: "Measurement",
                value: "Reps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 161L,
                column: "Measurement",
                value: "Reps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 162L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 163L,
                column: "Measurement",
                value: "Reps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 164L,
                column: "Measurement",
                value: "Reps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 165L,
                column: "Measurement",
                value: "Reps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 166L,
                column: "Measurement",
                value: "Reps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 167L,
                column: "Measurement",
                value: "Reps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 168L,
                column: "Measurement",
                value: "Duration");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 169L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 170L,
                column: "Measurement",
                value: "Reps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 171L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 172L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 173L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.UpdateData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 174L,
                column: "Measurement",
                value: "WeightReps");

            migrationBuilder.InsertData(
                table: "Exercises",
                columns: new[] { "Id", "AlternateName", "Category", "Equipment", "IsArchived", "Measurement", "Name", "UserId" },
                values: new object[,]
                {
                    { 175L, null, "Other", "Bodyweight", false, "Reps", "Bicycle Crunch", null },
                    { 176L, null, "Other", "Bodyweight", false, "Reps", "Side Crunch", null },
                    { 177L, null, "Other", "Bodyweight", false, "Reps", "Sit-up", null },
                    { 178L, null, "Other", "Bodyweight", false, "Reps", "V-up", null },
                    { 179L, null, "Other", "Bodyweight", false, "Reps", "Heel Touch", null },
                    { 180L, null, "Other", "Bodyweight", false, "Reps", "Toe Touch", null },
                    { 181L, null, "Other", "Bodyweight", false, "Reps", "Flutter Kicks", null },
                    { 182L, null, "Other", "Bodyweight", false, "Reps", "Scissor Kicks", null },
                    { 183L, null, "Other", "Bodyweight", false, "Reps", "Mountain Climber", null },
                    { 184L, null, "Other", "Bodyweight", false, "Reps", "Dead Bug", null },
                    { 185L, null, "Other", "Bodyweight", false, "Reps", "Bird Dog", null },
                    { 186L, null, "Other", "Bodyweight", false, "Reps", "Jackknife Sit-up", null },
                    { 187L, null, "Other", "Bodyweight", false, "Reps", "Windshield Wiper", null },
                    { 188L, null, "Other", "Bodyweight", false, "Reps", "Dragon Flag", null },
                    { 189L, null, "Other", "Bodyweight", false, "Duration", "Hollow Body Hold", null },
                    { 190L, null, "Other", "Bodyweight", false, "Duration", "L-Sit", null },
                    { 191L, null, "Other", "Bodyweight", false, "Duration", "Dead Hang", null },
                    { 192L, null, "Legs", "Bodyweight", false, "Duration", "Wall Sit", null }
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_SetEntry_RepsOrDuration",
                table: "SetEntries",
                sql: "(\"Reps\" > 0 AND \"DurationSeconds\" IS NULL) OR (\"Reps\" IS NULL AND \"DurationSeconds\" > 0)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_SetEntry_RepsOrDuration",
                table: "SetEntries");

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 175L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 176L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 177L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 178L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 179L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 180L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 181L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 182L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 183L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 184L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 185L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 186L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 187L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 188L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 189L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 190L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 191L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 192L);

            migrationBuilder.DropColumn(
                name: "DurationSeconds",
                table: "SetEntries");

            migrationBuilder.DropColumn(
                name: "Measurement",
                table: "Exercises");

            migrationBuilder.AlterColumn<int>(
                name: "Reps",
                table: "SetEntries",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_SetEntry_Reps_Positive",
                table: "SetEntries",
                sql: "\"Reps\" > 0");
        }
    }
}
