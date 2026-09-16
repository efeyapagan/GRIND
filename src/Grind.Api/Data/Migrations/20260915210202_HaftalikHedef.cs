using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Grind.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class HaftalikHedef : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "WeeklyTargetDays",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "CK_User_WeeklyTargetDays_Range",
                table: "Users",
                sql: "\"WeeklyTargetDays\" IS NULL OR (\"WeeklyTargetDays\" >= 1 AND \"WeeklyTargetDays\" <= 7)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_User_WeeklyTargetDays_Range",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "WeeklyTargetDays",
                table: "Users");
        }
    }
}
