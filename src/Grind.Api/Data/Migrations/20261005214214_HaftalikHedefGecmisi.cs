using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class HaftalikHedefGecmisi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WeeklyTargetChanges",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    EffectiveFromWeek = table.Column<DateOnly>(type: "date", nullable: false),
                    TargetDays = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyTargetChanges", x => x.Id);
                    table.CheckConstraint("CK_WeeklyTargetChange_TargetDays_Range", "\"TargetDays\" IS NULL OR (\"TargetDays\" >= 1 AND \"TargetDays\" <= 7)");
                    table.ForeignKey(
                        name: "FK_WeeklyTargetChanges_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyTargetChanges_UserId_EffectiveFromWeek",
                table: "WeeklyTargetChanges",
                columns: new[] { "UserId", "EffectiveFromWeek" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WeeklyTargetChanges");
        }
    }
}
