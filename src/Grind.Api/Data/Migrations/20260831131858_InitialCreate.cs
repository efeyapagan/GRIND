using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BodyWeightLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Weight = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    RecordedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BodyWeightLogs", x => x.Id);
                    table.CheckConstraint("CK_BodyWeightLog_Weight_Positive", "\"Weight\" > 0");
                    table.ForeignKey(
                        name: "FK_BodyWeightLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "Exercises",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:IdentitySequenceOptions", "'1000', '1', '', '', 'False', '1'")
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<long>(type: "bigint", nullable: true),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Category = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsArchived = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Exercises", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Exercises_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "WorkoutTemplates",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WorkoutTemplates_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ExerciseMedia",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ExerciseId = table.Column<long>(type: "bigint", nullable: false),
                    MediaType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExerciseMedia", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExerciseMedia_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "TemplateExercises",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorkoutTemplateId = table.Column<long>(type: "bigint", nullable: false),
                    ExerciseId = table.Column<long>(type: "bigint", nullable: false),
                    OrderIndex = table.Column<int>(type: "integer", nullable: false),
                    PlannedSets = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TemplateExercises", x => x.Id);
                    table.CheckConstraint("CK_TemplateExercise_PlannedSets_Positive", "\"PlannedSets\" > 0");
                    table.ForeignKey(
                        name: "FK_TemplateExercises_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_TemplateExercises_WorkoutTemplates_WorkoutTemplateId",
                        column: x => x.WorkoutTemplateId,
                        principalTable: "WorkoutTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WorkoutSessions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    TemplateId = table.Column<long>(type: "bigint", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Notes = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WorkoutSessions", x => x.Id);
                    table.CheckConstraint("CK_WorkoutSession_EndedAt_After_StartedAt", "\"EndedAt\" IS NULL OR \"EndedAt\" > \"StartedAt\"");
                    table.ForeignKey(
                        name: "FK_WorkoutSessions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WorkoutSessions_WorkoutTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "WorkoutTemplates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "SetEntries",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorkoutSessionId = table.Column<long>(type: "bigint", nullable: false),
                    ExerciseId = table.Column<long>(type: "bigint", nullable: false),
                    Weight = table.Column<decimal>(type: "numeric(6,2)", precision: 6, scale: 2, nullable: false),
                    Reps = table.Column<int>(type: "integer", nullable: false),
                    RecordType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Rir = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SetEntries", x => x.Id);
                    table.CheckConstraint("CK_SetEntry_Reps_Positive", "\"Reps\" > 0");
                    table.CheckConstraint("CK_SetEntry_Rir_NonNegative", "\"Rir\" IS NULL OR \"Rir\" >= 0");
                    table.CheckConstraint("CK_SetEntry_Weight_NonNegative", "\"Weight\" >= 0");
                    table.ForeignKey(
                        name: "FK_SetEntries_Exercises_ExerciseId",
                        column: x => x.ExerciseId,
                        principalTable: "Exercises",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_SetEntries_WorkoutSessions_WorkoutSessionId",
                        column: x => x.WorkoutSessionId,
                        principalTable: "WorkoutSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AiInsights",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Kind = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    WorkoutSessionId = table.Column<long>(type: "bigint", nullable: true),
                    SetEntryId = table.Column<long>(type: "bigint", nullable: true),
                    Content = table.Column<string>(type: "text", nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    TokensUsed = table.Column<int>(type: "integer", nullable: true),
                    EstimatedCostUsd = table.Column<decimal>(type: "numeric(10,6)", precision: 10, scale: 6, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AiInsights", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AiInsights_SetEntries_SetEntryId",
                        column: x => x.SetEntryId,
                        principalTable: "SetEntries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_AiInsights_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AiInsights_WorkoutSessions_WorkoutSessionId",
                        column: x => x.WorkoutSessionId,
                        principalTable: "WorkoutSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "Exercises",
                columns: new[] { "Id", "Category", "IsArchived", "Name", "UserId" },
                values: new object[,]
                {
                    { 1L, "Push", false, "Bench Press", null },
                    { 2L, "Push", false, "Incline Dumbbell Press", null },
                    { 3L, "Push", false, "Overhead Press", null },
                    { 4L, "Push", false, "Dips", null },
                    { 5L, "Push", false, "Triceps Pushdown", null },
                    { 6L, "Pull", false, "Pull-up", null },
                    { 7L, "Pull", false, "Barbell Row", null },
                    { 8L, "Pull", false, "Lat Pulldown", null },
                    { 9L, "Pull", false, "Barbell Curl", null },
                    { 10L, "Pull", false, "Face Pull", null },
                    { 11L, "Legs", false, "Squat", null },
                    { 12L, "Legs", false, "Deadlift", null },
                    { 13L, "Legs", false, "Romanian Deadlift", null },
                    { 14L, "Legs", false, "Leg Press", null },
                    { 15L, "Legs", false, "Leg Curl", null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_AiInsights_SetEntryId",
                table: "AiInsights",
                column: "SetEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_AiInsights_UserId_CreatedAt",
                table: "AiInsights",
                columns: new[] { "UserId", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_AiInsights_WorkoutSessionId",
                table: "AiInsights",
                column: "WorkoutSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_BodyWeightLogs_UserId_RecordedAt",
                table: "BodyWeightLogs",
                columns: new[] { "UserId", "RecordedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ExerciseMedia_ExerciseId",
                table: "ExerciseMedia",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_Exercises_UserId_Name",
                table: "Exercises",
                columns: new[] { "UserId", "Name" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);

            migrationBuilder.CreateIndex(
                name: "IX_SetEntries_ExerciseId_WorkoutSessionId",
                table: "SetEntries",
                columns: new[] { "ExerciseId", "WorkoutSessionId" });

            migrationBuilder.CreateIndex(
                name: "IX_SetEntries_WorkoutSessionId",
                table: "SetEntries",
                column: "WorkoutSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateExercises_ExerciseId",
                table: "TemplateExercises",
                column: "ExerciseId");

            migrationBuilder.CreateIndex(
                name: "IX_TemplateExercises_WorkoutTemplateId_OrderIndex",
                table: "TemplateExercises",
                columns: new[] { "WorkoutTemplateId", "OrderIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_TemplateId",
                table: "WorkoutSessions",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutSessions_UserId_StartedAt",
                table: "WorkoutSessions",
                columns: new[] { "UserId", "StartedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_WorkoutTemplates_UserId",
                table: "WorkoutTemplates",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AiInsights");

            migrationBuilder.DropTable(
                name: "BodyWeightLogs");

            migrationBuilder.DropTable(
                name: "ExerciseMedia");

            migrationBuilder.DropTable(
                name: "TemplateExercises");

            migrationBuilder.DropTable(
                name: "SetEntries");

            migrationBuilder.DropTable(
                name: "Exercises");

            migrationBuilder.DropTable(
                name: "WorkoutSessions");

            migrationBuilder.DropTable(
                name: "WorkoutTemplates");

            migrationBuilder.DropTable(
                name: "Users");
        }
    }
}
