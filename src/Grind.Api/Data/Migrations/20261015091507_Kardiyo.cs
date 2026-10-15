using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Kardiyo : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CardioEntries",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorkoutSessionId = table.Column<long>(type: "bigint", nullable: false),
                    ExerciseId = table.Column<long>(type: "bigint", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DurationSeconds = table.Column<int>(type: "integer", nullable: true),
                    SpeedKmh = table.Column<decimal>(type: "numeric(4,1)", precision: 4, scale: 1, nullable: true),
                    InclinePercent = table.Column<decimal>(type: "numeric(4,1)", precision: 4, scale: 1, nullable: true),
                    Level = table.Column<int>(type: "integer", nullable: true),
                    Damper = table.Column<int>(type: "integer", nullable: true),
                    DistanceKm = table.Column<decimal>(type: "numeric(6,3)", precision: 6, scale: 3, nullable: true),
                    Cadence = table.Column<int>(type: "integer", nullable: true),
                    Floors = table.Column<int>(type: "integer", nullable: true),
                    Steps = table.Column<int>(type: "integer", nullable: true),
                    Jumps = table.Column<int>(type: "integer", nullable: true),
                    Watts = table.Column<int>(type: "integer", nullable: true),
                    IsDurationRecord = table.Column<bool>(type: "boolean", nullable: false),
                    IsDistanceRecord = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ClientRequestId = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CardioEntries", x => x.Id);
                    table.CheckConstraint("CK_CardioEntry_Duration_Positive", "\"DurationSeconds\" IS NULL OR \"DurationSeconds\" > 0");
                    table.ForeignKey(
                        name: "FK_CardioEntries_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_CardioEntries_WorkoutSessions_WorkoutSessionId",
                        column: x => x.WorkoutSessionId,
                        principalTable: "WorkoutSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Exercises",
                columns: new[] { "Id", "AlternateName", "Category", "Equipment", "IsArchived", "Measurement", "Name", "UserId" },
                values: new object[,]
                {
                    { 193L, "Koşu bandı", "Cardio", "Machine", false, "Cardio", "Treadmill", null },
                    { 194L, "Yürüyüş bandı", "Cardio", "Machine", false, "Cardio", "Walking Pad", null },
                    { 195L, "Kondisyon bisikleti", "Cardio", "Machine", false, "Cardio", "Stationary Bike", null },
                    { 196L, "Yatay bisiklet", "Cardio", "Machine", false, "Cardio", "Recumbent Bike", null },
                    { 197L, "Spinning bisikleti", "Cardio", "Machine", false, "Cardio", "Spin Bike", null },
                    { 198L, "Hava bisikleti", "Cardio", "Machine", false, "Cardio", "Air Bike", null },
                    { 199L, "Eliptik bisiklet", "Cardio", "Machine", false, "Cardio", "Elliptical", null },
                    { 200L, "Merdiven makinesi", "Cardio", "Machine", false, "Cardio", "Stair Climber", null },
                    { 201L, "Step aleti", "Cardio", "Machine", false, "Cardio", "Stepper", null },
                    { 202L, "Kürek makinesi", "Cardio", "Machine", false, "Cardio", "Rowing Machine", null },
                    { 203L, "Kayak ergometresi", "Cardio", "Machine", false, "Cardio", "Ski Erg", null },
                    { 204L, "Dikey tırmanma makinesi", "Cardio", "Machine", false, "Cardio", "Vertical Climber", null },
                    { 205L, "İp atlama", "Cardio", "Other", false, "Cardio", "Jump Rope", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_CardioEntries_ExerciseId_WorkoutSessionId",
                table: "CardioEntries",
                columns: new[] { "ExerciseId", "WorkoutSessionId" });

            migrationBuilder.CreateIndex(
                name: "IX_CardioEntries_WorkoutSessionId_ClientRequestId",
                table: "CardioEntries",
                columns: new[] { "WorkoutSessionId", "ClientRequestId" },
                unique: true,
                filter: "\"ClientRequestId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_CardioEntries_WorkoutSessionId_Running",
                table: "CardioEntries",
                column: "WorkoutSessionId",
                unique: true,
                filter: "\"DurationSeconds\" IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CardioEntries");

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 193L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 194L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 195L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 196L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 197L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 198L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 199L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 200L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 201L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 202L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 203L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 204L);

            migrationBuilder.DeleteData(
                table: "Exercises",
                keyColumn: "Id",
                keyValue: 205L);
        }
    }
}
